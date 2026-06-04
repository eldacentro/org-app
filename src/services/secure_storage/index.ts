import BaseDexie from 'dexie';

/**
 * Almacenamiento seguro de claves de cifrado (master key + access code) en el
 * dispositivo del usuario VIP, para reducir la fricción de re-introducirlas.
 *
 * IMPORTANTE — diseño:
 * - Se usa una base IndexedDB SEPARADA ('organized_secure'), NO `appDb`
 *   ('organized'). La base 'organized' se borra por completo en logout y en
 *   recuperaciones automáticas (ver `dbAppDelete` -> `Dexie.delete('organized')`).
 *   Si guardáramos las claves ahí, se perderían justo en los escenarios donde
 *   queremos recuperarlas. Esta base separada sobrevive a ese borrado y solo se
 *   limpia explícitamente con `clearKeysSecurely` (logout manual).
 *
 * IMPORTANTE — seguridad:
 * - La clave AES se deriva del UID de Firebase del usuario. El UID NO es un
 *   secreto, por lo que esto es ofuscación, no seguridad criptográfica real
 *   frente a un atacante con acceso a la IndexedDB del dispositivo. La frontera
 *   de seguridad real es el propio dispositivo. No se introduce ningún hueco
 *   nuevo respecto al estado actual (las claves ya se persisten en texto plano
 *   en `app_settings`).
 * - Las claves NUNCA salen del dispositivo ni se envían a ningún servidor.
 */

type SecureKeyRecord = {
  userId: string;
  iv: number[];
  data: number[];
};

interface SecureKeysTable {
  secure_keys: BaseDexie.Table<SecureKeyRecord, string>;
}

type SecureDb = BaseDexie & SecureKeysTable;

const secureDb = new BaseDexie('organized_secure') as SecureDb;

secureDb.version(1).stores({
  secure_keys: 'userId',
});

const SALT = 'elda-centro-salt';
const PBKDF2_ITERATIONS = 100000;

const isCryptoAvailable = () =>
  typeof crypto !== 'undefined' && !!crypto.subtle;

const deriveKey = async (userId: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const saveKeysSecurely = async (
  userId: string,
  masterKey: string,
  accessCode: string
): Promise<boolean> => {
  if (!userId || !isCryptoAvailable()) return false;

  try {
    const derivedKey = await deriveKey(userId);

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = encoder.encode(JSON.stringify({ masterKey, accessCode }));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      data
    );

    await secureDb.secure_keys.put({
      userId,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
    });

    return true;
  } catch (error) {
    console.error('saveKeysSecurely failed:', error);
    return false;
  }
};

export const loadKeysSecurely = async (
  userId: string
): Promise<{ masterKey: string; accessCode: string } | null> => {
  if (!userId || !isCryptoAvailable()) return null;

  try {
    const record = await secureDb.secure_keys.get(userId);
    if (!record) return null;

    const derivedKey = await deriveKey(userId);

    const iv = new Uint8Array(record.iv);
    const encrypted = new Uint8Array(record.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encrypted
    );

    const decoder = new TextDecoder();
    const parsed = JSON.parse(decoder.decode(decrypted)) as {
      masterKey: string;
      accessCode: string;
    };

    if (
      typeof parsed?.masterKey !== 'string' ||
      typeof parsed?.accessCode !== 'string'
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    // Datos corruptos o UID que no coincide: tratar como "sin claves guardadas".
    console.error('loadKeysSecurely failed:', error);
    return null;
  }
};

export const clearKeysSecurely = async (userId: string): Promise<void> => {
  if (!userId) return;

  try {
    await secureDb.secure_keys.where('userId').equals(userId).delete();
  } catch (error) {
    console.error('clearKeysSecurely failed:', error);
  }
};

export const hasKeysSecurely = async (userId: string): Promise<boolean> => {
  if (!userId || !isCryptoAvailable()) return false;

  try {
    const count = await secureDb.secure_keys.where('userId').equals(userId).count();
    return count > 0;
  } catch {
    return false;
  }
};
