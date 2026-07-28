import type { MetadataRecordType } from '@definition/metadata';

/**
 * Decisiones del sync casi-instantáneo, fuera del hook para poder probarlas.
 *
 * El hook (`wrapper/web_worker/useInstantSync`) se queda con lo que solo tiene
 * sentido dentro de React —suscribirse, leer estados, hablar con el worker— y
 * aquí vive lo que decide SI se sincroniza y CUÁNDO. Esa parte no tenía ni una
 * prueba, y es justamente de la que depende que la señal sirva para algo.
 */

// Reparto aleatorio del disparo entre dispositivos: sin él, los ~30 de la
// congregación pedirían la descarga en el mismo instante tras cada edición.
//
// Era de 2 a 12 s, elegido a ojo antes de medir nada. Medido el tránsito real
// de la señal (0,15–0,35 s de Firestore al navegador) y contados los demás
// tramos —4 s de agrupado de la subida, 3 s del debounce del worker en CADA
// extremo, 0,5 s de agrupado en el backend—, esos 12 s eran el tramo más
// grande del recorrido con diferencia: la media del reparto (7 s) pesaba más
// que todo lo demás junto en el lado del receptor.
//
// La ventana la fija el PICO DE CARGA, no la latencia. Lo que se reparte no
// son peticiones de ~7 KB: cuando la tabla que ha cambiado es grande, cada
// dispositivo se baja la tabla ENTERA, y medido en el bucket eso son 1,53 MB
// de programas o 2,88 MB de informes. Con 30 dispositivos:
//
//   ventana 10 s (2–12) →  3,0 disp/s → ~4,6 MB/s saliendo de Render
//   ventana  7 s (1–8)  →  4,3 disp/s → ~6,6 MB/s
//   ventana  4 s (1–5)  →  7,5 disp/s → ~11,5 MB/s   ← demasiado
//
// y Render además tiene que traerse el fichero de Storage en cada una. Se
// eligió 1–8: baja la media del reparto de 7 s a 4,5 s (que es de donde sale
// la mejora de latencia) sin acercarse al doble de pico. Bajar más solo tiene
// sentido si antes se hace el sync incremental, que es lo que quitaría los
// megas de la ecuación.
//
// EL TECHO DE VERDAD NO ES EL ANCHO DE BANDA, ES EL LIMITADOR. El backend
// tiene `rateLimit({ windowMs: 1000, max: 20 })` en `app.ts`, y es **por IP**:
// en el Salón del Reino todos los móviles salen por la misma. Con la ventana
// de 7 s son ~4,3 peticiones/s (margen de 4,6×); con una de 4 s serían 7,5/s,
// y pasarse de 20 devuelve TOO_MANY_REQUESTS, que al hermano le llega como un
// `BACKUP_FAILED` en rojo. Cualquiera que estreche esta ventana tiene que
// rehacer esta cuenta primero.
//
// Se conserva el reparto aleatorio, que es lo que de verdad protege: sin él
// los 30 dispositivos piden en el mismo instante.
export const SIGNAL_DELAY_MIN_MS = 1000;
export const SIGNAL_DELAY_MAX_MS = 8000;

export const pickSignalDelay = (random: () => number = Math.random) =>
  SIGNAL_DELAY_MIN_MS + random() * (SIGNAL_DELAY_MAX_MS - SIGNAL_DELAY_MIN_MS);

/**
 * Qué tablas de la señal traen algo que este dispositivo no tiene.
 *
 * Devuelve nombres, no un booleano, porque el nombre es la mitad del
 * diagnóstico: cuando algo va raro, lo primero que hay que saber es QUÉ tabla
 * está avanzando.
 *
 * La comparación es lexicográfica entre cadenas ISO, y funciona porque el
 * cliente guarda VERBATIM la versión que le manda el servidor
 * (`buildMetadataRecord` ← `result.metadata[tabla]` ← `cong.metadata[tabla]`),
 * que es la misma cadena que el backend mete en la señal.
 *
 * OJO con la guarda `local` vacío — es intencionada y protectora, no un
 * descuido. Una versión local vacía significa "este dispositivo no ha recibido
 * nunca esta tabla", y eso pasa sobre todo cuando el ROL no la incluye: un
 * dispositivo que no es del secretario tiene `incoming_reports: ''` para
 * siempre. Si se disparara igualmente, cada informe que envía cualquier
 * publicador —decenas a fin de mes— despertaría a los 30 dispositivos de la
 * congregación para bajar algo que el servidor no les va a dar nunca. El caso
 * legítimo que se pierde (una tabla vacía en el servidor que recibe su primer
 * contenido) se arregla solo: lo trae el ciclo periódico en unos minutos, y a
 * partir de ahí esa tabla ya tiene versión local y va por la vía instantánea
 * como todas.
 */
export const findNewerTables = (
  tables: Record<string, string> | undefined,
  local: MetadataRecordType['metadata'] | undefined
): string[] => {
  if (!tables || !local) return [];

  return Object.entries(tables)
    .filter(([table, version]) => {
      const current = local[table]?.version;

      if (!current) return false;
      if (typeof version !== 'string') return false;

      return version > current;
    })
    .map(([table]) => table);
};

export type SignalScheduler = {
  /**
   * `already-pending` cuando ya había un disparo esperando: la señal nueva se
   * absorbe en él en vez de reprogramarlo.
   */
  schedule: (delayMs: number) => 'scheduled' | 'already-pending';
  cancel: () => void;
  isPending: () => boolean;
};

/**
 * Agrupa las señales que llegan en ráfaga en un solo ciclo de sincronización.
 *
 * La versión anterior hacía `clearTimeout` y volvía a sortear el retraso con
 * CADA señal. Con un solo hermano editando eso ya retrasaba el ciclo (sus
 * señales llegan cada ~8 s y el retraso sorteado pasaba de 8 s cuatro de cada
 * diez veces); con dos o tres editando a la vez —la noche de la asistencia, o
 * una reunión de ancianos— las señales caen cada pocos segundos y el disparo
 * se iba posponiendo una y otra vez: el dispositivo dejaba de recibir nada por
 * la vía instantánea justo cuando más movimiento había, y se quedaba esperando
 * al ciclo periódico sin que nada fallara ni se notara.
 *
 * Ahora el primero que programa manda: la fecha de disparo no se mueve, y las
 * señales que lleguen mientras tanto viajan en ese mismo ciclo (que además
 * descarga TODO lo pendiente, no solo lo de la señal que lo disparó).
 */
export const createSignalScheduler = (fire: () => void): SignalScheduler => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // `cancel` es definitivo. El manejador de la señal es asíncrono (lee la
  // metadata de Dexie antes de decidir), así que una señal que estuviera a
  // medias justo cuando se desmonta la escucha llegaba después del cancel y
  // programaba un disparo sobre un planificador ya muerto. No hacía daño
  // —triggerSync vuelve a comprobar backupEnabled—, pero el planificador se
  // crea de nuevo en cada suscripción, así que no hay ningún motivo para
  // revivir el viejo.
  let stopped = false;

  return {
    schedule: (delayMs: number) => {
      if (stopped) return 'already-pending';
      if (timer !== null) return 'already-pending';

      timer = setTimeout(() => {
        timer = null;
        fire();
      }, delayMs);

      return 'scheduled';
    },

    cancel: () => {
      stopped = true;

      if (timer === null) return;

      clearTimeout(timer);
      timer = null;
    },

    isPending: () => timer !== null,
  };
};
