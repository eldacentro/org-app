import { MetadataRecordType } from '@definition/metadata';

/**
 * Qué se da por enviado al terminar un ciclo de sincronización.
 *
 * Vive aparte y sin dependencias A PROPÓSITO: decide qué cambios se dan por
 * subidos, y equivocarse aquí pierde datos sin que nadie se entere. Tiene que
 * poder comprobarse solo, sin Dexie ni worker de por medio.
 */

// La clave con la que viaja cada tabla no siempre se llama igual que su
// entrada en metadata. Lo que no está aquí se busca por su propio nombre.
export const PAYLOAD_TO_METADATA_KEY: Record<string, string> = {
  sched: 'schedules',
};

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
    .filter((key) => !PAYLOAD_KEYS_WITHOUT_FLAG.has(key))
    .map((key) => PAYLOAD_TO_METADATA_KEY[key] ?? key);

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
}: {
  current: MetadataRecordType['metadata'];
  /** Claves que viajaron. Sin lista se limpia todo (comportamiento de antes). */
  uploaded?: string[];
  /** Huella por tabla al construir el envío. */
  snapshot?: Record<string, string>;
  /** Huella por tabla ahora. */
  actual?: Record<string, string>;
}): MetadataRecordType['metadata'] => {
  const result = {} as MetadataRecordType['metadata'];

  for (const [key, values] of Object.entries(current)) {
    const viajo = !uploaded || uploaded.includes(key);

    // Solo se concluye «cambió» cuando hay con qué compararlo. Sin huella no se
    // inventa nada: se hace lo de siempre.
    const cambioPorElCamino =
      !!snapshot && key in snapshot && snapshot[key] !== actual?.[key];

    const seLimpia = viajo && !cambioPorElCamino;

    result[key] = {
      ...values,
      send_local: seLimpia ? false : values.send_local,
    };
  }

  return result;
};
