import {
  Timestamp,
  deleteField,
  getDoc,
  collection,
  doc as fsDoc,
  getDocFromServer,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './index';
import { generateShareToken } from '@services/encryption/share';
import {
  SpeakerAnswerType,
  SpeakerDinnerRotationType,
  SpeakerDinnerType,
  SpeakerInvitationType,
} from '@definition/speaker_invitation';

/** Cuánto vale un enlace. De sobra para una invitación que se manda con meses. */
const DIAS_DE_VIDA = 120;

const coleccion = (congId: string) =>
  collection(firestore, `congregation/${congId}/speaker_invitations`);

/**
 * Crea la invitación y devuelve su token.
 *
 * Si ya hubiera una viva para esa semana y ese orador, se REUTILIZA en vez de
 * crear otra: si cada vez que se genera la carta naciera un enlace nuevo, el
 * orador podría contestar en uno y la congregación estar mirando otro.
 */
export const crearInvitacionOrador = async (
  congId: string,
  datos: Omit<
    SpeakerInvitationType,
    'token' | 'expiresAt' | 'revoked' | 'respuesta'
  >
): Promise<string> => {
  const existente = await buscarInvitacion(congId, datos.weekOf, datos.speakerUid);

  if (existente) return existente.token;

  const token = generateShareToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DIAS_DE_VIDA);

  await setDoc(fsDoc(coleccion(congId), token), {
    ...datos,
    revoked: false,
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  return token;
};

/**
 * TODAS las invitaciones de la congregación.
 *
 * Hace falta enteras porque el turno de la cena de una semana depende de lo que
 * pasó en las anteriores: si el orador no se quedó, ese grupo no gastó turno
 * (ver `services/app/rotacion_cenas`). Con la fecha sola no se puede saber.
 *
 * Exige sesión: la regla solo deja enumerar a quien la tiene.
 */
export const listarInvitaciones = async (
  congId: string
): Promise<SpeakerInvitationType[]> => {
  const snap = await getDocs(coleccion(congId));

  return snap.docs
    .map((d) => ({ ...(d.data() as SpeakerInvitationType), token: d.id }))
    .filter((inv) => !inv.revoked);
};

/** La invitación de una semana y un orador, si la hay. */
export const buscarInvitacion = async (
  congId: string,
  weekOf: string,
  speakerUid: string
): Promise<SpeakerInvitationType | null> => {
  const snap = await getDocs(
    query(
      coleccion(congId),
      where('weekOf', '==', weekOf),
      where('speakerUid', '==', speakerUid)
    )
  );

  const vivo = snap.docs.find((d) => d.data().revoked !== true);

  if (!vivo) return null;

  return { ...(vivo.data() as SpeakerInvitationType), token: vivo.id };
};

/**
 * Lo que lee la página pública.
 *
 * `getDocFromServer` SIEMPRE, nunca `getDoc`: con la caché persistente, un
 * enlace ya caducado se serviría desde el disco del propio móvil sin que la
 * regla de Firestore llegue a evaluarse. Es la misma razón por la que se hace
 * así en los enlaces de territorio.
 */
export const leerInvitacion = async (
  congId: string,
  token: string
): Promise<SpeakerInvitationType | null> => {
  try {
    const snap = await getDocFromServer(fsDoc(coleccion(congId), token));

    if (!snap.exists()) return null;

    return { ...(snap.data() as SpeakerInvitationType), token: snap.id };
  } catch {
    // La regla deniega un enlace caducado o anulado: para quien lo abre es lo
    // mismo que si no existiera, y es lo que tiene que ver.
    return null;
  }
};

/**
 * La respuesta del orador. ES LA ÚNICA ESCRITURA SIN SESIÓN DE LA APLICACIÓN.
 *
 * Se manda solo el campo `respuesta` porque es lo único que la regla de
 * Firestore deja tocar a quien no está autenticado; cualquier otro campo en el
 * mismo `update` haría que la denegara entera.
 */
export const responderInvitacion = async (
  congId: string,
  token: string,
  respuesta: Omit<SpeakerAnswerType, 'respondidoEl'>
) => {
  await updateDoc(fsDoc(coleccion(congId), token), {
    respuesta: {
      ...respuesta,
      comentario: respuesta.comentario.slice(0, 300),
      respondidoEl: new Date().toISOString(),
    },
  });
};

/** Anula un enlace. No se puede resucitar: la regla solo deja ir a `true`. */
export const anularInvitacion = async (congId: string, token: string) => {
  await updateDoc(fsDoc(coleccion(congId), token), { revoked: true });
};

/**
 * Lo que anota la congregación cuando el orador contesta POR OTRO LADO.
 *
 * Casi siempre contestará por WhatsApp o por teléfono. Si lo único registrable
 * fuera lo que él escribe en el enlace, el panel enseñaría «sin contestar» en
 * semanas ya resueltas y no serviría de nada.
 */
export const anotarRespuesta = async (
  congId: string,
  token: string,
  respuesta: Omit<SpeakerAnswerType, 'respondidoEl'>
) => {
  await updateDoc(fsDoc(coleccion(congId), token), {
    respuesta: {
      ...respuesta,
      comentario: respuesta.comentario.slice(0, 300),
      respondidoEl: new Date().toISOString(),
    },
  });
};

/**
 * Deja la invitación como si nadie hubiera contestado.
 *
 * Anotar a mano se equivoca: se marca «viene» en la semana de al lado, o
 * alguien lo da por confirmado de oídas. Sin esto, el único arreglo sería
 * elegir entre dos mentiras, y «todavía no se sabe» es la verdad.
 *
 * Y ahora pesa más que antes: una semana sin respuesta NO gasta turno de cena,
 * así que dejarla mal puesta descoloca la rotación de las siguientes.
 *
 * Se BORRA el campo en vez de guardar un hueco, para que vuelva a estar
 * exactamente como antes de que nadie tocara nada.
 */
export const borrarRespuesta = async (congId: string, token: string) => {
  await updateDoc(fsDoc(coleccion(congId), token), {
    respuesta: deleteField(),
  });
};

// ─── Las notas de la cena ───────────────────────────────────────────────────
//
// Aquí vivía también a qué FAMILIA se le asignaba. Se quitó el 2026-10-08: la
// cena se le encarga a un GRUPO y el grupo se organiza por dentro, que es como
// se hace de verdad. Queda la nota suelta por si hay algo que recordar.
//
// Sigue en una subcolección que EXIGE SESIÓN: el documento de la invitación se
// lee sin autenticar, así que lo que se guardara allí se lo llevaría quien
// tuviera el enlace.

const docCena = (congId: string, token: string) =>
  fsDoc(
    firestore,
    `congregation/${congId}/speaker_invitations/${token}/privado/cena`
  );

export const leerCena = async (
  congId: string,
  token: string
): Promise<SpeakerDinnerType | null> => {
  const snap = await getDoc(docCena(congId, token));

  if (!snap.exists()) return null;

  return snap.data() as SpeakerDinnerType;
};

export const guardarCena = async (
  congId: string,
  token: string,
  datos: Omit<SpeakerDinnerType, 'updatedAt'>
) => {
  await setDoc(docCena(congId, token), {
    ...datos,
    updatedAt: new Date().toISOString(),
  });
};

// ─── La rotación de cenas ───────────────────────────────────────────────────

const docRotacion = (congId: string) =>
  fsDoc(firestore, `congregation/${congId}/speaker_dinner/rotacion`);

export const leerRotacionCenas = async (
  congId: string
): Promise<SpeakerDinnerRotationType | null> => {
  const snap = await getDoc(docRotacion(congId));

  if (!snap.exists()) return null;

  return snap.data() as SpeakerDinnerRotationType;
};

export const guardarRotacionCenas = async (
  congId: string,
  datos: Omit<SpeakerDinnerRotationType, 'updatedAt'>
) => {
  await setDoc(docRotacion(congId), {
    ...datos,
    updatedAt: new Date().toISOString(),
  });
};
