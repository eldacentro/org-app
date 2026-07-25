/**
 * Cifrado de los enlaces públicos de territorio.
 *
 * Cada enlace tiene su propia clave AES-GCM de 256 bits, generada al azar. El
 * snapshot del territorio se guarda cifrado con ella en Firestore, y la clave
 * viaja ÚNICAMENTE en el fragmento (`#`) de la URL, que el navegador nunca
 * envía al servidor ni incluye en la cabecera `Referer`. Ni Firestore ni nadie
 * que lea la base de datos puede abrir el contenido de un enlace.
 *
 * Se sigue la convención que ya usa `deterministic.ts` (IV de 12 bytes al
 * principio del blob) para no tener dos formatos distintos en el repo, pero NO
 * se reutiliza su código: aquí la clave es aleatoria, no derivada de un email,
 * y su conversión a base64 (`btoa(String.fromCharCode(...payload))`) revienta
 * con `RangeError` en payloads grandes por el spread — una geometría de
 * territorio la supera con facilidad.
 */

const PAYLOAD_PREFIX = 'v1.';

/** Límite duro. Firestore corta en 1 MiB por documento y base64 infla ~33 %. */
const MAX_PAYLOAD_CHARS = 700_000;

/** Longitud exacta de la clave en base64url — sirve para detectar enlaces cortados. */
export const SHARE_KEY_LENGTH = 43;

// ─── base64url ──────────────────────────────────────────────────────────────
// Por trozos: `String.fromCharCode(...bytes)` desborda la pila de llamadas por
// encima de ~100 KB, y el payload de un territorio puede pasar de ahí.

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 8192;

  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK))
    );
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);

  return out;
};

// ─── Token y clave ──────────────────────────────────────────────────────────

/**
 * Identificador del enlace (y del documento en Firestore). 24 bytes = 192 bits
 * de aleatoriedad: inadivinable por fuerza bruta. No se usa el auto-ID de
 * Firestore, que solo aporta ~119 bits. base64url no contiene `/` ni `.`, así
 * que siempre es un ID de documento válido.
 */
export const generateShareToken = (): string =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(24)));

export const generateShareKey = (): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(32));

export const shareKeyToString = (key: Uint8Array): string => toBase64Url(key);

export const shareKeyFromString = (value: string): Uint8Array =>
  fromBase64Url(value);

// ─── Cifrado ────────────────────────────────────────────────────────────────

/**
 * Ata el texto cifrado a SU documento: sin esto, alguien con acceso de
 * escritura podría copiar el `payload` de un enlace a otro documento y
 * seguiría descifrándose. Con AAD, el descifrado falla.
 */
const buildAad = (congId: string, token: string): Uint8Array =>
  new TextEncoder().encode(`ts1|${congId}|${token}`);

const importKey = (raw: Uint8Array, usage: 'encrypt' | 'decrypt') =>
  crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, [usage]);

export const encryptSharePayload = async (
  payload: unknown,
  key: Uint8Array,
  congId: string,
  token: string
): Promise<string> => {
  const cryptoKey = await importKey(key, 'encrypt');
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: buildAad(congId, token) as BufferSource,
      tagLength: 128,
    },
    cryptoKey,
    new TextEncoder().encode(JSON.stringify(payload)) as BufferSource
  );

  const blob = new Uint8Array(iv.length + encrypted.byteLength);
  blob.set(iv, 0);
  blob.set(new Uint8Array(encrypted), iv.length);

  const result = PAYLOAD_PREFIX + toBase64Url(blob);

  if (result.length > MAX_PAYLOAD_CHARS) {
    throw new Error(
      'El territorio es demasiado grande para compartirlo por enlace. ' +
        'Suele deberse a una geometría con muchísimos puntos.'
    );
  }

  return result;
};

export const decryptSharePayload = async <T>(
  value: string,
  key: Uint8Array,
  congId: string,
  token: string
): Promise<T> => {
  if (!value.startsWith(PAYLOAD_PREFIX)) {
    throw new Error('Formato de enlace desconocido');
  }

  const blob = fromBase64Url(value.slice(PAYLOAD_PREFIX.length));
  const iv = blob.subarray(0, 12);
  const encrypted = blob.subarray(12);

  const cryptoKey = await importKey(key, 'decrypt');

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: buildAad(congId, token) as BufferSource,
      tagLength: 128,
    },
    cryptoKey,
    encrypted as BufferSource
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
};

// ─── Hash de contenido ──────────────────────────────────────────────────────

/**
 * Huella del snapshot en claro. Sirve para saber si el enlace se ha quedado
 * obsoleto (alguien editó el territorio o sus direcciones) sin tener que
 * acordarse de avisar desde cada punto de guardado.
 */
export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value) as BufferSource
  );

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
