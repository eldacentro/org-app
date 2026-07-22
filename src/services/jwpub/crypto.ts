import pako from 'pako';

// ── Cifrado del contenido de un .jwpub ───────────────────────────────────
// JW Library guarda el HTML de cada documento (Document.Content, y también
// Footnote.Content) como un BLOB: HTML → zlib (deflate nivel 6) → AES-128-CBC.
// La clave se deriva de una "master key" pública (documentada en las
// implementaciones de referencia de código abierto, la misma familia
// sws2apps que hace esta app) combinada con la identidad de la publicación.
//
// Algoritmo verificado byte-a-byte contra archivos oficiales:
//   pubCard      = `${MepsLanguageIndex}_${Symbol}_${Year}`  (libros)
//                  (+ `_${IssueTagNumber}` en revistas)
//   keyMaterial  = SHA256(pubCard) XOR masterKey            (32 bytes)
//   key          = keyMaterial[0..16]
//   iv           = keyMaterial[16..32]
//   cipher       = AES-128-CBC(PKCS#7) sobre deflate(html, nivel 6)
//
// Reglas de oro:
// - La terna language/symbol/year del pubCard debe coincidir EXACTAMENTE con
//   la fila Publication y con manifest.publication, o el lector no descifra.
// - deflate DEBE ser nivel 6 (pako) para reproducir el formato original.

const MASTER_KEY_HEX =
  '11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7';

const hexToBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const MASTER_KEY = hexToBytes(MASTER_KEY_HEX);

export type PubIdentity = {
  languageIndex: number; // MepsLanguageIndex (1 = español)
  symbol: string;
  year: number;
  issue?: number; // IssueTagNumber; 0/undefined en libros
};

/** pubCard exacto que entra en la derivación de clave. */
export const buildPubCard = (pub: PubIdentity): string => {
  const base = `${pub.languageIndex}_${pub.symbol}_${pub.year}`;
  return pub.issue && pub.issue > 0 ? `${base}_${pub.issue}` : base;
};

const deriveKeyIv = async (
  pubCard: string
): Promise<{ key: CryptoKey; iv: Uint8Array }> => {
  const cardBytes = new TextEncoder().encode(pubCard);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', cardBytes));

  const material = new Uint8Array(32);
  for (let i = 0; i < 32; i++) material[i] = digest[i] ^ MASTER_KEY[i];

  const key = await crypto.subtle.importKey(
    'raw',
    material.slice(0, 16),
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, iv: material.slice(16, 32) };
};

/** HTML de un documento → BLOB cifrado listo para Document.Content. */
export const encryptContent = async (
  html: string,
  pub: PubIdentity
): Promise<Uint8Array> => {
  const { key, iv } = await deriveKeyIv(buildPubCard(pub));
  const compressed = pako.deflate(new TextEncoder().encode(html), { level: 6 });
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: iv as BufferSource },
    key,
    compressed as BufferSource
  );
  return new Uint8Array(cipher);
};

/** BLOB de Document.Content → HTML descifrado (para verificar/importar). */
export const decryptContent = async (
  blob: Uint8Array,
  pub: PubIdentity
): Promise<string> => {
  const { key, iv } = await deriveKeyIv(buildPubCard(pub));
  const compressed = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv as BufferSource },
    key,
    blob as BufferSource
  );
  return new TextDecoder().decode(pako.inflate(new Uint8Array(compressed)));
};
