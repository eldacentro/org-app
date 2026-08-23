import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from './index';
import { SpeakerOverride } from '@services/app/speaker_overrides';

/**
 * Dónde viven las correcciones a los discursos del circuito.
 *
 * En Firestore, por congregación, con el mismo patrón que Territorios. NO en la
 * tabla de oradores y NO en la sincronización E2E, y esas dos cosas son el
 * asunto entero: la tabla de oradores la reconstruye el Sheet del circuito en
 * cada pasada, así que cualquier corrección guardada ahí dura hasta la
 * madrugada siguiente.
 *
 * Se comparten con toda la congregación a propósito: quien recibe el aviso de
 * que un hermano cambió sus discursos no suele ser el mismo que programa el fin
 * de semana.
 *
 * No va cifrado. Lo que hay aquí son números de bosquejo y una nota de dónde
 * salió el dato — la misma información que está en una hoja de cálculo que
 * comparte el circuito entero.
 */

const overridesCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'speaker_overrides');

const overrideDoc = (congId: string, speakerUid: string) =>
  doc(firestore, 'congregation', congId, 'speaker_overrides', speakerUid);

export const guardarCorreccionOrador = async (
  congId: string,
  correccion: SpeakerOverride
) => {
  await setDoc(overrideDoc(congId, correccion.speakerUid), {
    speakerUid: correccion.speakerUid,
    talks: correccion.talks,
    note: correccion.note ?? '',
    byName: correccion.byName ?? '',
    updatedAt: correccion.updatedAt,
  });
};

export const borrarCorreccionOrador = async (
  congId: string,
  speakerUid: string
) => {
  await deleteDoc(overrideDoc(congId, speakerUid));
};

export const subscribeCorreccionesOradores = (
  congId: string,
  onUpdate: (correcciones: SpeakerOverride[]) => void
): (() => void) =>
  onSnapshot(
    overridesCol(congId),
    (snap) => {
      const correcciones = snap.docs
        .map((d) => d.data() as DocumentData)
        .filter(
          (d) => typeof d.speakerUid === 'string' && Array.isArray(d.talks)
        )
        .map((d) => ({
          speakerUid: d.speakerUid as string,
          talks: (d.talks as unknown[])
            .map(Number)
            .filter((n) => Number.isFinite(n) && n > 0),
          note: (d.note as string) ?? '',
          byName: (d.byName as string) ?? '',
          updatedAt: (d.updatedAt as string) ?? '',
        }));

      onUpdate(correcciones);
    },
    (error) => {
      // Sin sesión, sin permisos o sin red. Que no lleguen las correcciones no
      // puede tumbar el catálogo: se ve lo que dice el Sheet, como antes.
      console.error('Error escuchando las correcciones de oradores:', error);
      onUpdate([]);
    }
  );
