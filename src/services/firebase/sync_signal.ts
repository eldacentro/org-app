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

export const subscribeSyncSignal = (
  congId: string,
  onUpdate: (signal: SyncSignal) => void
): (() => void) => {
  const signalDoc = doc(firestore, 'congregation', congId, 'sync', 'signal');

  return onSnapshot(
    signalDoc,
    (snapshot) => {
      if (!snapshot.exists()) return;
      onUpdate(snapshot.data() as SyncSignal);
    },
    (error) => console.error('Error en suscripción de señal de sync:', error)
  );
};
