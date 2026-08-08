import { MetadataRecordType } from '@definition/metadata';

/**
 * Qué se da por enviado al terminar un ciclo de sincronización.
 *
 * Vive aparte y sin dependencias A PROPÓSITO: decide qué cambios se dan por
 * subidos, y equivocarse aquí pierde datos sin que nadie se entere. Tiene que
 * poder comprobarse solo, sin Dexie ni worker de por medio.
 */

// La clave con la que viaja cada tabla no siempre se llama igual que su entrada
// en metadata, y a veces UNA clave de envío lleva DOS marcas dentro: los ajustes
// viajan juntos bajo `app_settings` pero se marcan por separado. Lo que no está
// aquí se busca por su propio nombre.
export const PAYLOAD_TO_METADATA_KEYS: Record<string, string[]> = {
  sched: ['schedules'],
  app_settings: ['user_settings', 'cong_settings'],
};

// Compatibilidad con `warnAboutUnrequestedTables`, que solo necesita el nombre.
export const PAYLOAD_TO_METADATA_KEY: Record<string, string> = {
  sched: 'schedules',
};

/**
 * Marcas que NUNCA pueden viajar, porque su tabla solo se recibe.
 *
 * `public_sources` y `public_schedules` las genera el servidor: el dispositivo
 * las baja y no las sube jamás. Nacen marcadas como pendientes
 * (`dexie/metadata.ts`), así que si se exigiera que hubieran viajado para
 * limpiarlas se quedarían puestas para siempre — que es exactamente el aro
 * amarillo eterno del 2026-08-07.
 */
const NUNCA_VIAJAN = new Set(['public_sources', 'public_schedules']);

// Claves que NO son una tabla sincronizada y por tanto no llevan `send_local`:
// datos derivados de la subida o cosas que solo viajan al arrancar.
export const PAYLOAD_KEYS_WITHOUT_FLAG = new Set([
  'affected_uids',
  'app_settings',
  'cong_users',
  'outgoing_speakers',
  'speakers_key',
]);

/** Las claves de metadata de las tablas que de verdad han viajado en un envío. */
export const payloadMetadataKeys = (payload: object): string[] =>
  Object.keys(payload)
    // `app_settings` sí lleva marcas dentro, así que no se filtra aquí aunque
    // esté en la lista de «no es una tabla»: esa lista es para otro uso.
    .filter((key) => key === 'app_settings' || !PAYLOAD_KEYS_WITHOUT_FLAG.has(key))
    .flatMap((key) => PAYLOAD_TO_METADATA_KEYS[key] ?? [key]);

/**
 * El nuevo estado de las marcas de «pendiente de subir».
 *
 * EL FALLO QUE ESTO ARREGLA, y es de los que no se ven. Antes se ponía
 * `send_local: false` en TODAS las tablas al terminar un ciclo, sin mirar si
 * habían viajado. Dos maneras de perder datos con eso, las dos calladas:
 *
 * 1. Lo que se edita MIENTRAS se sube. El envío se construye, la subida tarda
 *    sus segundos —contra este servidor han sido hasta diez—, y lo que se toque
 *    en ese rato se marca como pendiente... y acto seguido se da por enviado
 *    sin haber salido del móvil. Se queda ahí para siempre y la congregación no
 *    lo ve nunca. Encaja con el «puse un crédito y al secretario no le llegó»
 *    del 2026-08-06.
 * 2. Lo que el rol no deja subir. Si algo marca una tabla que esta cuenta no
 *    puede enviar, no viaja y se limpiaba igual.
 *
 * Se limpia solo lo que iba en el envío Y sigue igual que cuando se construyó.
 * La comparación es por CONTENIDO porque `send_local` es un sí/no y no sabe
 * decir «me han vuelto a tocar»: antes y después de una segunda edición vale
 * `true` en los dos casos.
 */
export const nextExportState = ({
  current,
  uploaded,
  snapshot,
  actual,
  sinNadaQueEnviar,
}: {
  current: MetadataRecordType['metadata'];
  /**
   * Claves que viajaron. NO decide qué se limpia —eso es todo—: acota de qué
   * tablas tiene sentido preguntarse si cambiaron mientras se subían.
   */
  uploaded?: string[];
  /** Huella por tabla al construir el envío. */
  snapshot?: Record<string, string>;
  /** Huella por tabla ahora. */
  actual?: Record<string, string>;
  /**
   * Tablas de las que este dispositivo no tiene NADA que enviar. Nunca. Su marca
   * se limpia aunque no hayan viajado, porque esperar a que viajen es esperar a
   * algo que no va a pasar. Dos motivos, los dos definitivos:
   *
   * 1. LA TABLA ESTÁ VACÍA. Sin un solo registro no hay nada que mandar, y una
   *    tabla vacía en un envío tampoco borra nada en el servidor: mandarla no
   *    haría absolutamente nada. Es el caso de las ocho de territorios, que solo
   *    viajan si tienen contenido.
   * 2. EL ROL NO LA DEJA SUBIR. Una publicadora recibe 113 semanas de material y
   *    125 programas y no puede enviarlos JAMÁS —van dentro de
   *    `if (scheduleEditor)`—. Su marca nace puesta, la primera bajada le llena
   *    la tabla, y a partir de ahí ni viaja ni está vacía: se quedaba puesta para
   *    siempre. Eso era el aro amarillo eterno que se veía en su móvil y no en el
   *    de un administrador, a quien esas tablas sí le viajan.
   *
   * Lo que sí tiene contenido y sí podría viajar sigue protegido si no viajó,
   * que es la mitad que evita perder cambios en silencio.
   */
  sinNadaQueEnviar?: string[];
}): MetadataRecordType['metadata'] => {
  const result = {} as MetadataRecordType['metadata'];

  for (const [key, values] of Object.entries(current)) {
    // OJO CON EL SENTIDO DE `uploaded`, que ya me costó un fallo. NO sirve para
    // decidir qué se limpia: hay 13 claves de metadata que nunca aparecen con su
    // nombre en un envío —los ajustes viajan dentro de `app_settings`, los
    // programas como `sched`, y las de territorios ni siquiera van por aquí,
    // que sincronizan por Firestore—. Filtrar por ella dejaba esas marcas
    // puestas PARA SIEMPRE: «cambios pendientes de enviar» eterno y el aro
    // amarillo clavado en todos los dispositivos.
    //
    // Se limpia todo, como siempre, MENOS lo que haya cambiado mientras se
    // subía. Y para eso sí se usa `uploaded`: solo tiene sentido preguntarse
    // «¿cambió por el camino?» de una tabla que de verdad iba en el envío. De
    // las demás no hay nada que esperar.
    const iba = !uploaded || uploaded.includes(key);

    const cambioPorElCamino =
      iba && !!snapshot && key in snapshot && snapshot[key] !== actual?.[key];

    // Se limpia lo que VIAJÓ y no cambió por el camino. Lo que no viajó sigue
    // pendiente: si no, un ciclo que no sube nada —porque lo único marcado es
    // una tabla que este rol no puede subir— daba por enviadas TODAS las
    // marcas, y ese cambio no salía del móvil jamás. Pasa de verdad: el
    // limpiador de duplicados de oradores marca esas tablas en todos los
    // dispositivos, pero solo las sube quien lleva los discursos públicos.
    //
    // Con la excepción de las que no pueden viajar nunca, que si se exigiera
    // que hubieran viajado se quedarían marcadas para siempre.
    const seLimpia =
      NUNCA_VIAJAN.has(key) ||
      sinNadaQueEnviar?.includes(key) ||
      (iba && !cambioPorElCamino);

    result[key] = {
      ...values,
      send_local: seLimpia ? false : values.send_local,
    };
  }

  return result;
};
