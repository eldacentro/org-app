import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from './index';

/**
 * Oleada de actualización forzada.
 *
 * Documento (escrito solo por el Admin SDK; los clientes tienen la escritura
 * denegada por las reglas de Firestore) que indica el número de build objetivo.
 * Cada dispositivo escucha este documento y, si su build es MENOR que
 * `target_build`, se actualiza y recarga solo (ver useForceUpdate) — respetando
 * que la persona no esté escribiendo en ese momento.
 *
 * Es inerte para quien ya está al día (build >= target_build), así que no hay
 * bucle: tras recargar, el dispositivo vuelve con un build >= target y no
 * reacciona de nuevo.
 */

export type ForceUpdateSignal = {
  target_build?: number;
};

export const subscribeForceUpdate = (
  congId: string,
  onUpdate: (signal: ForceUpdateSignal) => void
): (() => void) => {
  const updateDoc = doc(firestore, 'congregation', congId, 'sync', 'force_update');

  return onSnapshot(
    updateDoc,
    (snapshot) => {
      if (!snapshot.exists()) return;
      onUpdate(snapshot.data() as ForceUpdateSignal);
    },
    (error) => console.error('Error en suscripción de oleada de actualización:', error)
  );
};
