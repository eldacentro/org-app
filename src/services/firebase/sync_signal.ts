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

// Firestore da por terminada la escucha cuando el callback de error salta
// (permisos, sesión que aún no estaba lista al abrir la app, un corte largo).
// Antes eso solo se escribía en la consola: la escucha se quedaba muerta y el
// dispositivo perdía el sync instantáneo hasta la siguiente recarga, sin que
// nadie lo notara. Se vuelve a suscribir sola, espaciando los intentos.
const RESUBSCRIBE_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

export const subscribeSyncSignal = (
  congId: string,
  onUpdate: (signal: SyncSignal) => void
): (() => void) => {
  const signalDoc = doc(firestore, 'congregation', congId, 'sync', 'signal');

  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const listen = () => {
    if (stopped) return;

    unsubscribe = onSnapshot(
      signalDoc,
      (snapshot) => {
        attempt = 0;
        if (!snapshot.exists()) return;
        onUpdate(snapshot.data() as SyncSignal);
      },
      (error) => {
        console.error('Error en suscripción de señal de sync:', error);

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
    if (retryTimer) clearTimeout(retryTimer);
    unsubscribe?.();
  };
};
