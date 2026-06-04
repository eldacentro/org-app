// Auto-aprobación por email (Mejora 1) — lado del admin.
//
// El backend no puede descifrar el email de una persona (cifrado E2E con el
// código de acceso). Por eso el cliente de un admin —que sí descifra Personas—
// calcula localmente el HMAC de cada email con la clave secreta de la
// congregación y sube solo los hashes. Los emails en claro nunca salen del
// dispositivo. El servidor usa ese índice para auto-aprobar a hermanos cuyo
// email de Google coincida (ver users_controller.joinCongregation en la API).

import { PersonType } from '@definition/person';
import { store } from '@states/index';
import { adminRoleState } from '@states/settings';
import { isOnlineState } from '@states/app';
import { apiGetAutoApprovalKey, apiSaveEmailIndex } from '@services/api/congregation';

// HMAC-SHA256(key, normalizedEmail) en hex. Replica exactamente el cálculo del
// backend (`crypto.createHmac('sha256', key)`), donde la clave es la cadena
// tratada como bytes UTF-8 y el mensaje es el email en minúsculas y sin
// espacios alrededor.
const hashEmail = async (email: string, key: string) => {
  const encoder = new TextEncoder();

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(email.trim().toLowerCase())
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Evita resubir el índice cuando el conjunto de emails no ha cambiado.
let lastSyncSignature = '';

export const syncAutoApprovalIndex = async (persons: PersonType[]) => {
  try {
    // Solo los admins pueden mantener el índice (el endpoint rechaza al resto).
    if (!store.get(adminRoleState)) return;
    if (!store.get(isOnlineState)) return;
    if (!crypto?.subtle) return;

    const withEmail = persons
      .filter((person) => !person._deleted?.value)
      .map((person) => ({
        person_uid: person.person_uid,
        email: (person.person_data.email?.value || '').trim(),
      }))
      .filter((person) => person.email.length > 0);

    const signature = JSON.stringify(
      withEmail.map((person) => [person.person_uid, person.email.toLowerCase()]).sort()
    );

    if (signature === lastSyncSignature) return;

    const { status, data } = await apiGetAutoApprovalKey();
    if (status !== 200 || !data?.email_hash_key) return;

    const key = data.email_hash_key as string;

    const entries = await Promise.all(
      withEmail.map(async (person) => ({
        person_uid: person.person_uid,
        hash: await hashEmail(person.email, key),
      }))
    );

    const result = await apiSaveEmailIndex(entries);

    if (result.status === 200) lastSyncSignature = signature;
  } catch (error) {
    // Best-effort: nunca interrumpir el flujo de la app por esto.
    console.error('syncAutoApprovalIndex failed:', error);
  }
};

// Permite forzar una resincronización (p. ej. tras cambiar de congregación).
export const resetAutoApprovalSync = () => {
  lastSyncSignature = '';
};
