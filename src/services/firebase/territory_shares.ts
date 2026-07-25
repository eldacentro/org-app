import {
  collection,
  doc as fsDoc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './index';
import { decryptData, encryptData } from '@services/encryption';
import {
  decryptSharePayload,
  encryptSharePayload,
  generateShareKey,
  generateShareToken,
  shareKeyFromString,
  shareKeyToString,
  sha256Hex,
} from '@services/encryption/share';
import {
  TerritoryShare,
  TerritorySharePayload,
} from '@definition/territory_shares';
import { ENC_PREFIX } from '@services/app/territories';
import { shareContentFingerprint } from '@services/app/territory_share';

/**
 * Enlaces públicos de territorio. Archivo aparte de `territories.ts`, que ya
 * ronda las mil líneas.
 *
 * La caducidad NO se gestiona aquí: la decide la regla de seguridad de
 * Firestore, que comprueba que la asignación del enlace siga abierta. Ver el
 * bloque `territory_shares` de `firestore.rules`.
 */

const sharesCol = (congId: string) =>
  collection(firestore, 'congregation', congId, 'territory_shares');

const shareDoc = (congId: string, token: string) =>
  fsDoc(firestore, 'congregation', congId, 'territory_shares', token);

// ─── Clave del enlace, envuelta con la clave maestra ────────────────────────
// La clave que abre el contenido viaja solo en la URL, así que la app no la
// tendría para poder refrescar el snapshot ni volver a copiar el enlace. Se
// guarda además envuelta con la clave maestra de la congregación: es la misma
// clave que ya protege las notas y las direcciones que van dentro, de modo que
// no añade ninguna exposición nueva, y el servidor sigue sin poder abrir nada.

const wrapKey = (key: Uint8Array, masterKey: string): string =>
  ENC_PREFIX + encryptData(shareKeyToString(key), masterKey);

const unwrapKey = (wrapped: string, masterKey: string): Uint8Array => {
  if (!wrapped.startsWith(ENC_PREFIX)) {
    throw new Error('La clave del enlace no está en el formato esperado');
  }

  const raw = decryptData(
    wrapped.slice(ENC_PREFIX.length),
    masterKey,
    'share.key'
  );

  return shareKeyFromString(raw);
};

// ─── Lectura ────────────────────────────────────────────────────────────────

export const subscribeShares = (
  congId: string,
  cb: (rows: TerritoryShare[]) => void
) =>
  onSnapshot(
    sharesCol(congId),
    (snap) => cb(snap.docs.map((d) => ({ ...d.data(), token: d.id }) as TerritoryShare)),
    (error) => console.error('Error al escuchar enlaces de territorio', error)
  );

/**
 * Lee un enlace y lo descifra. Es lo que usa la página pública.
 *
 * `getDocFromServer` a propósito, NUNCA `getDoc` ni `onSnapshot`:
 *  - la caché persistente de Firestore serviría desde IndexedDB un enlace ya
 *    caducado, sin volver a pasar por las reglas;
 *  - un listener no reevalúa la regla cuando cambia OTRO documento (la
 *    asignación), así que seguiría emitiendo datos tras entregar el territorio.
 */
export const fetchPublicShare = async (
  congId: string,
  token: string,
  keyB64: string
): Promise<TerritorySharePayload> => {
  const snap = await getDocFromServer(shareDoc(congId, token));

  if (!snap.exists()) {
    throw new Error('not-found');
  }

  const data = snap.data() as TerritoryShare;

  return decryptSharePayload<TerritorySharePayload>(
    data.payload,
    shareKeyFromString(keyB64),
    congId,
    token
  );
};

// ─── Escritura ──────────────────────────────────────────────────────────────

/**
 * Crea un enlace y devuelve el token y la clave. La clave NO se guarda en
 * claro en ningún sitio: quien llama debe componer la URL con ella al vuelo,
 * porque después ya no se puede recuperar más que desenvolviéndola con la
 * clave maestra.
 */
export const createShare = async ({
  congId,
  assignmentId,
  territoryId,
  payload,
  masterKey,
  createdBy,
}: {
  congId: string;
  assignmentId: string;
  territoryId: string;
  payload: TerritorySharePayload;
  masterKey: string;
  createdBy: string;
}): Promise<{ token: string; keyB64: string }> => {
  const token = generateShareToken();
  const key = generateShareKey();
  const now = new Date().toISOString();

  // El token es el ID del documento, así que no se repite dentro.
  const fields: Omit<TerritoryShare, 'token'> = {
    assignmentId,
    territoryId,
    revoked: false,
    createdAt: now,
    createdBy,
    updatedAt: now,
    payload: await encryptSharePayload(payload, key, congId, token),
    keyWrapped: wrapKey(key, masterKey),
    contentHash: await sha256Hex(shareContentFingerprint(payload)),
  };

  await setDoc(shareDoc(congId, token), fields);

  return { token, keyB64: shareKeyToString(key) };
};

/** Revocación manual. La caducidad automática la hace la regla. */
export const revokeShare = (congId: string, token: string) =>
  updateDoc(shareDoc(congId, token), {
    revoked: true,
    updatedAt: new Date().toISOString(),
  });

/**
 * Reescribe el snapshot de un enlace con el contenido actual. Se llama cuando
 * el territorio ha cambiado desde que se creó el enlace (lo detecta el hash),
 * para que quien lo tenga no vea datos viejos.
 */
export const refreshShare = async ({
  congId,
  share,
  payload,
  masterKey,
}: {
  congId: string;
  share: TerritoryShare;
  payload: TerritorySharePayload;
  masterKey: string;
}): Promise<void> => {
  const key = unwrapKey(share.keyWrapped, masterKey);

  await updateDoc(shareDoc(congId, share.token), {
    payload: await encryptSharePayload(payload, key, congId, share.token),
    contentHash: await sha256Hex(shareContentFingerprint(payload)),
    updatedAt: new Date().toISOString(),
  });
};

/** Recupera la clave de un enlace ya creado, para volver a copiar la URL. */
export const recoverShareKey = (
  share: TerritoryShare,
  masterKey: string
): string => shareKeyToString(unwrapKey(share.keyWrapped, masterKey));

/**
 * Enlaces de una asignación, leídos del servidor. Se usa al abrir el diálogo de
 * compartir para no fiarse de la caché y ofrecer "crear otro" cuando ya hay uno.
 */
export const fetchSharesForAssignment = async (
  congId: string,
  assignmentId: string
): Promise<TerritoryShare[]> => {
  const snap = await getDocsFromServer(
    query(sharesCol(congId), where('assignmentId', '==', assignmentId))
  );

  return snap.docs.map((d) => ({ ...d.data(), token: d.id }) as TerritoryShare);
};
