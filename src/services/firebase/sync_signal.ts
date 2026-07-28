import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from './index';

/**
 * Señal de sincronización casi-instantánea.
 *
 * El backend (Render) escribe en este documento, tras cada subida que hace
 * avanzar alguna tabla, SOLO { tabla: timestamp-de-versión } — cero contenido,
 * el E2E queda intacto. Aquí solo lo escuchamos: si alguna versión remota es
 * más nueva que la local, se adelanta el ciclo de sync normal (misma descarga,
 * mismo descifrado, misma fusión de siempre).
 *
 * Las reglas de Firestore deniegan la escritura a todos los clientes; solo
 * escribe el Admin SDK del backend. `enabled: false` es el kill-switch remoto.
 */

export type SyncSignal = {
  enabled?: boolean;
  tables?: Record<string, string>;
};

/**
 * `initial: true` es la PRIMERA entrega tras engancharse (o tras reengancharse
 * después de un corte), no un timbre.
 *
 * onSnapshot entrega siempre el documento que ya existe en cuanto se suscribe
 * —comprobado contra el proyecto real: un callback a los 343 ms sin que nadie
 * hubiera escrito nada—. Sin distinguirlo, el indicador de "Acerca de" ponía
 * "último aviso hace 0 minutos" cada vez que se abría la aplicación, dijera lo
 * que dijera la realidad: el único instrumento que teníamos para saber si la
 * señal llegaba de verdad no podía distinguir un aviso de su propia conexión.
 * Reaccionar SÍ hay que reaccionar (esa primera entrega es la que recupera lo
 * que cambió mientras el dispositivo estaba cerrado); lo que no vale es
 * CONTARLA como aviso.
 */
export type SyncSignalMeta = { initial: boolean };

// Firestore da por terminada la escucha cuando el callback de error salta
// (permisos, sesión que aún no estaba lista al abrir la app, un corte largo).
// Antes eso solo se escribía en la consola: la escucha se quedaba muerta y el
// dispositivo perdía el sync instantáneo hasta la siguiente recarga, sin que
// nadie lo notara. Se vuelve a suscribir sola, espaciando los intentos.
const RESUBSCRIBE_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

export const subscribeSyncSignal = (
  congId: string,
  onUpdate: (signal: SyncSignal, meta: SyncSignalMeta) => void,
  /** Si la escucha está viva. Sirve para poder DECIRLO en la interfaz. */
  onStatus?: (listening: boolean) => void
): (() => void) => {
  const signalDoc = doc(firestore, 'congregation', congId, 'sync', 'signal');

  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  // por suscripción: una reconexión vuelve a empezar por una entrega inicial
  let delivered = 0;

  const listen = () => {
    if (stopped) return;

    delivered = 0;

    unsubscribe = onSnapshot(
      signalDoc,
      (snapshot) => {
        attempt = 0;
        onStatus?.(true);
        if (!snapshot.exists()) return;

        delivered += 1;
        onUpdate(snapshot.data() as SyncSignal, { initial: delivered === 1 });
      },
      (error) => {
        console.error('Error en suscripción de señal de sync:', error);
        onStatus?.(false);

        if (stopped) return;

        const delay =
          RESUBSCRIBE_DELAYS_MS[
            Math.min(attempt, RESUBSCRIBE_DELAYS_MS.length - 1)
          ];

        attempt += 1;

        retryTimer = setTimeout(listen, delay);
      }
    );
  };

  listen();

  return () => {
    stopped = true;
    onStatus?.(false);
    if (retryTimer) clearTimeout(retryTimer);
    unsubscribe?.();
  };
};
