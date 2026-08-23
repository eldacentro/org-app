import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
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

/**
 * Las correcciones, para meterlas en la copia de seguridad.
 *
 * Viven en Firestore, así que una copia que solo mire la base local se las deja
 * fuera y nadie se entera — exactamente el agujero que tenían los territorios.
 */
export const fetchSpeakerOverridesBackup = async (
  congId: string
): Promise<DocumentData[]> => {
  const snap = await getDocs(overridesCol(congId));

  return snap.docs.map((d) => d.data());
};

/**
 * Reponerlas desde una copia.
 *
 * NO se vacía nada: se escribe lo que trae la copia y lo que exista ahora y no
 * esté en ella se queda. Misma decisión que en los territorios — restaurar sirve
 * para deshacer un estropicio, no para volver el reloj atrás y perder por el
 * camino una corrección de esta semana.
 */
export const restaurarCorreccionesOradores = async (
  congId: string,
  correcciones: DocumentData[]
): Promise<number> => {
  const validas = (correcciones ?? []).filter(
    (c) => typeof c?.speakerUid === 'string' && Array.isArray(c?.talks)
  );

  if (validas.length === 0) return 0;

  const batch = writeBatch(firestore);

  for (const correccion of validas) {
    batch.set(overrideDoc(congId, correccion.speakerUid as string), correccion);
  }

  await batch.commit();

  return validas.length;
};
