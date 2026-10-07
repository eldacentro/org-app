import {
  Timestamp,
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
