/**
 * Cifrado de los enlaces públicos de territorio.
 *
 * Cada enlace tiene su propia clave AES-GCM generada al azar (128 bits en los
 * enlaces nuevos, 256 en los de antes: el descifrado toma la que venga). El
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

/**
 * ¿Tiene esta clave una longitud creíble? Sirve para detectar enlaces cortados
 * al copiarlos, que es lo que de verdad pasa (se corta al pegar en WhatsApp).
 *
 * Se aceptan DOS: 22 caracteres son los enlaces nuevos (clave de 16 bytes) y 43
 * los de antes (32 bytes). Los viejos siguen abriéndose hasta que caduquen.
 */
export const isShareKeyLength = (value: string): boolean =>
  value.length === 22 || value.length === 43;

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

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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
/**
 * 16 bytes, no 24. Son 128 bits: adivinar uno a ciegas es tan imposible como
 * antes, y el enlace se queda en 22 caracteres en vez de 32. El token además
 * caduca solo a los pocos días, así que ni siquiera hay tiempo para intentarlo.
 */
export const generateShareToken = (): string =>
  toBase64Url(crypto.getRandomValues(new Uint8Array(16)));

/**
 * AES-128 en vez de AES-256, y es una decisión, no un descuido.
 *
 * AES-128 está sin romper y es lo que usa medio internet; aquí protege el
 * recorte de un territorio dentro de un enlace que caduca en unos días. A
 * cambio, la clave pasa de 43 caracteres a 22 en una URL que se manda por
 * WhatsApp, y un enlace que no cabe de una línea es un enlace que la gente
 * corta al pegarlo.
 *
 * Los enlaces de antes llevan clave de 32 bytes y se siguen abriendo: el
 * descifrado toma la longitud de la clave que venga.
 */
export const generateShareKey = (): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(16));

export const shareKeyToString = (key: Uint8Array): string => toBase64Url(key);

/**
 * El identificador de congregación, en corto.
 *
 * Es un UUID, y escrito como tal ocupa 36 caracteres para guardar 16 bytes: los
 * guiones y las mayúsculas son relleno. En base64url son 22, sin perder ni un
 * bit — es el trozo más largo del enlace y el que más feo lo hacía.
 */
export const congIdToShort = (congId: string): string => {
  const hex = congId.replace(/-/g, '');

  if (!/^[0-9a-fA-F]{32}$/.test(hex)) return congId;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);

  return toBase64Url(bytes);
};

/** La vuelta: de la forma corta al UUID con el que se consulta Firestore. */
export const congIdFromShort = (value: string): string => {
  // Un UUID de toda la vida (enlace antiguo): se devuelve tal cual.
  if (value.includes('-')) return value;

  try {
    const bytes = fromBase64Url(value);

    if (bytes.length !== 16) return value;

    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ]
      .join('-')
      .toUpperCase();
  } catch {
    return value;
  }
};

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
  crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, [
    usage,
  ]);

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
