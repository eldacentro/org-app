import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from './index';
import { MeetingRunRecord } from '@services/app/meeting_run';

/**
 * La reunión que se está siguiendo, para que la vean los demás.
 *
 * NO pasa por la sincronización E2E, y es a propósito: esa capa manda tablas
 * enteras cada pocos minutos y ya ha costado dos incidentes de pérdida de datos.
 * Esto es un único documento pequeño por semana que se reescribe cuando cambia
 * la parte —una docena de veces en toda la reunión—, con el mismo patrón que
 * Territorios: Firestore, por congregación.
 *
 * QUÉ VIAJA: en qué parte va la reunión, a qué hora empezó cada cosa y la lista
 * de pasos. Con eso cada teléfono calcula por su cuenta el reloj y el retraso.
 * No es información delicada: es la misma que ve cualquiera mirando la
 * plataforma. Las NOTAS del presidente no viajan (ver `readRunNotes`).
 *
 * QUIÉN ESCRIBE: solo el DISPOSITIVO que la lleva (`ownerDevice`), y cada vez
 * que alguien toma el control sube `epoch`. La regla de Firestore rechaza una
 * escritura con un `epoch` viejo, así que un teléfono que perdió el mando —y que
 * a lo mejor tenía escrituras esperando a que volviera la red— ya no puede
 * pisar a quien la lleva ahora. Antes eso volvía loca la reunión al pasar el
 * control: los dos escribían a la vez y los tiempos dejaban de valer.
 */

export type SharedMeetingRun = MeetingRunRecord & {
  ownerUid: string;
  ownerName: string;
  /** El teléfono que la lleva. Vacío en reuniones de la versión anterior. */
  ownerDevice?: string;
  /** Sube en uno cada vez que cambia de manos. */
  epoch?: number;
  /** Se dejó de seguir. Se marca en vez de borrar (ver `descartar`). */
  descartada?: boolean;
  updatedAt: string;
};

const DEVICE_KEY = 'meetingRunDevice';

/**
 * Un identificador de ESTE teléfono, que no cambia entre recargas.
 *
 * El mando es del dispositivo y no de la persona: la misma persona con el móvil
 * y la tableta abiertos eran dos «dueños» que se pisaban.
 */
export const meetingRunDeviceId = (): string => {
  try {
    const guardado = localStorage.getItem(DEVICE_KEY);

    if (guardado) return guardado;

    const nuevo = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, nuevo);

    return nuevo;
  } catch {
    // Sin almacenamiento: vale para esta visita.
    return SIN_ALMACENAMIENTO;
  }
};

const SIN_ALMACENAMIENTO = crypto.randomUUID();

/**
 * Un identificador de semana lleva barras («2026/08/17») y Firestore no las
 * admite dentro del nombre de un documento: partiría la ruta en subcolecciones.
 */
const runDoc = (congId: string, weekOf: string, dataView: string) =>
  doc(
    firestore,
    'congregation',
    congId,
    'meeting_run',
    `${weekOf.replace(/\//g, '-')}_${dataView}`
  );

/** Firestore rechaza los campos con valor `undefined`, también dentro de listas. */
const sinIndefinidos = <T>(valor: T): T => {
  if (Array.isArray(valor)) return valor.map(sinIndefinidos) as T;

  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sinIndefinidos(v)])
    ) as T;
  }

  return valor;
};

export const publishMeetingRun = async ({
  congId,
  run,
  ownerUid,
  ownerName,
  epoch,
  descartada = false,
}: {
  congId: string;
  run: MeetingRunRecord;
  ownerUid: string;
  ownerName: string;
  epoch: number;
  descartada?: boolean;
}) => {
  // Las notas no se suben nunca, ni las que viniera arrastrando una reunión
  // guardada con la versión anterior.
  const sinNotas: Partial<MeetingRunRecord> = { ...run };
  delete sinNotas.notes;

  await setDoc(
    runDoc(congId, run.weekOf, run.dataView),
    sinIndefinidos({
      ...sinNotas,
      ownerUid,
      ownerName,
      ownerDevice: meetingRunDeviceId(),
      epoch,
      descartada,
      updatedAt: new Date().toISOString(),
    })
  );
};

export type MeetingRunSubscription = {
  run: SharedMeetingRun | null;
  /** Ya se sabe si hay reunión o no (aunque sea de la caché). */
  cargado: boolean;
  /** No se puede leer (sin sesión de Firebase, sin permisos). */
  error: boolean;
};

export const subscribeMeetingRun = (
  congId: string,
  weekOf: string,
  dataView: string,
  onUpdate: (estado: MeetingRunSubscription) => void
): (() => void) =>
  onSnapshot(
    runDoc(congId, weekOf, dataView),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate({ run: null, cargado: true, error: false });
        return;
      }

      const data = { ...(snapshot.data() as SharedMeetingRun) };

      // Las de la versión anterior venían cifradas con la llave maestra: no se
      // leen ni se enseñan.
      delete data.notes;

      onUpdate({ run: data, cargado: true, error: false });
    },
    (error) => {
      // Sin sesión, sin permisos o sin red. Que no se pueda seguir la reunión
      // de otro no es un error que enseñar: la página funciona igual que
      // siempre, y quien preside la lleva en su teléfono.
      console.error('Error en suscripción de la reunión en directo:', error);
      onUpdate({ run: null, cargado: true, error: true });
    }
  );
