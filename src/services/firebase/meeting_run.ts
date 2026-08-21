import {
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from './index';
import { decryptData, encryptData } from '@services/encryption';
import { ENC_PREFIX } from '@services/app/territories';
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
 * QUÉ VIAJA: en qué parte va la reunión y a qué hora empezó. Con eso, cada
 * teléfono calcula por su cuenta el reloj y las horas corridas, así que no hace
 * falta escribir nada cada segundo. Y no es información delicada: es la misma
 * que ve cualquiera mirando la plataforma.
 *
 * LAS NOTAS SÍ VIAJAN, siempre y cifradas con la llave maestra, para que quien
 * las escribe se las encuentre en sus otros dispositivos. Lo que decide el
 * ajuste de la congregación es si se le ENSEÑAN a los demás ancianos, y eso lo
 * aplica la aplicación al leerlas, no el cifrado.
 *
 * Conviene decirlo claro: con la llave maestra en la mano, un anciano podría
 * abrirlas aunque el ajuste esté apagado. Es el mismo nivel de confianza que el
 * resto de la aplicación —las reglas de Firestore comprueban que haya sesión,
 * no el cargo—, pero no es lo mismo que «no salen del teléfono». Frente a un
 * publicador sí es hermético: sin llave maestra no hay nada que leer.
 */

export type SharedMeetingRun = MeetingRunRecord & {
  ownerUid: string;
  ownerName: string;
  updatedAt: string;
};

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

const cifrarNotas = (
  notes: Record<string, string> | undefined,
  key: string
): Record<string, string> => {
  // Sin llave maestra NO se sube en claro: acabarían legibles para toda la
  // congregación, y sin el prefijo nadie las distinguiría de las cifradas. Es
  // la misma decisión que en Territorios.
  if (!notes || !key) return {};

  return Object.fromEntries(
    Object.entries(notes).map(([clave, texto]) => [
      clave,
      ENC_PREFIX + encryptData(texto, key),
    ])
  );
};

/**
 * Las notas que este dispositivo SÍ puede leer.
 *
 * Lo que no se pueda descifrar se deja fuera en vez de enseñarlo: un publicador
 * —o un anciano sin la llave maestra en ese teléfono— vería `enc::...`, que no
 * dice nada y parece un error. Aquí se puede tirar sin miedo porque quien
 * escucha nunca escribe: las notas propias viven aparte, en su teléfono.
 */
export const notasLegibles = (
  notes: Record<string, string> | undefined,
  key: string
): Record<string, string> => {
  if (!notes) return {};

  const salida: Record<string, string> = {};

  for (const [clave, valor] of Object.entries(notes)) {
    if (typeof valor !== 'string') continue;

    if (!valor.startsWith(ENC_PREFIX)) {
      salida[clave] = valor;
      continue;
    }

    if (!key) continue;

    try {
      salida[clave] = decryptData(valor.slice(ENC_PREFIX.length), key, clave);
    } catch {
      // Llave equivocada o dato roto: mejor sin nota que con basura.
    }
  }

  return salida;
};

/** Firestore rechaza los campos con valor `undefined`. */
const sinIndefinidos = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, valor]) => valor !== undefined)
  ) as T;

export const publishMeetingRun = async ({
  congId,
  run,
  masterKey,
  ownerUid,
  ownerName,
}: {
  congId: string;
  run: MeetingRunRecord;
  masterKey: string;
  ownerUid: string;
  ownerName: string;
}) => {
  await setDoc(
    runDoc(congId, run.weekOf, run.dataView),
    sinIndefinidos({
      ...run,
      notes: cifrarNotas(run.notes, masterKey),
      ownerUid,
      ownerName,
      updatedAt: new Date().toISOString(),
    })
  );
};

export const removeMeetingRun = async (
  congId: string,
  weekOf: string,
  dataView: string
) => {
  await deleteDoc(runDoc(congId, weekOf, dataView));
};

export const subscribeMeetingRun = (
  congId: string,
  weekOf: string,
  dataView: string,
  masterKey: string,
  onUpdate: (run: SharedMeetingRun | null) => void
): (() => void) =>
  onSnapshot(
    runDoc(congId, weekOf, dataView),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }

      const data = snapshot.data() as DocumentData;

      onUpdate({
        ...(data as SharedMeetingRun),
        notes: notasLegibles(data.notes, masterKey),
      });
    },
    (error) => {
      // Sin sesión, sin permisos o sin red. Que no se pueda seguir la reunión
      // de otro no es un error que enseñar: la página funciona igual que
      // siempre.
      console.error('Error en suscripción de la reunión en directo:', error);
      onUpdate(null);
    }
  );
