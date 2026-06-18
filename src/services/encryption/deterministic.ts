// Motor Criptográfico Determinístico para la "Entrada Silenciosa"
// Permite derivar una clave simétrica (AES-GCM) a partir del email del publicador.

const DETERMINISTIC_SALT = 'org-app-deterministic-salt-v1';

export const deriveDeterministicKey = async (email: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const emailData = encoder.encode(email.trim().toLowerCase());
  const saltData = encoder.encode(DETERMINISTIC_SALT);

  // 1. Importar el email como material base para PBKDF2
  const baseKey = await crypto.subtle.importKey(
    'raw',
    emailData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 2. Derivar la clave AES-GCM (256 bits) usando 100,000 iteraciones
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // No extraíble por seguridad
    ['encrypt', 'decrypt']
  );

  return derivedKey;
};

export const encryptAccessCodeForInvite = async (accessCode: string, email: string): Promise<string> => {
  const key = await deriveDeterministicKey(email);
  const encoder = new TextEncoder();
  
  // AES-GCM requiere un Vector de Inicialización (IV) único de 12 bytes.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(accessCode)
  );

  // Concatenar IV + Payload Encriptado para que puedan ser transmitidos juntos
  const payload = new Uint8Array(iv.length + encryptedContent.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(encryptedContent), iv.length);
  
  // Convertir a Base64 para el transporte en el JSON
  return btoa(String.fromCharCode(...payload));
};

export const decryptAccessCodeFromInvite = async (encryptedDataB64: string, email: string): Promise<string> => {
  const key = await deriveDeterministicKey(email);
  
  // Decodificar Base64
  const binaryStr = atob(encryptedDataB64);
  const payload = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    payload[i] = binaryStr.charCodeAt(i);
  }

  // Extraer el IV (primeros 12 bytes) y el Payload
  const iv = payload.slice(0, 12);
  const encryptedContent = payload.slice(12);

  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedContent
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedContent);
};
