import { localStorageGetItem } from '@utils/common';

export const AP_APPLICATIONS_SEEN_KEY = 'organized_ap_applications_seen';

/**
 * Qué solicitudes de precursor auxiliar ya se han abierto.
 *
 * El aviso deja de salir en cuanto se abre la solicitud, aunque siga
 * pendiente de aprobar: una vez que el secretario la ha visto, seguir
 * anunciándosela cada vez que abre la campana no le dice nada nuevo — la
 * solicitud sigue en su página, que es donde se atiende.
 *
 * Vive en localStorage y no en la solicitud misma a propósito: "ya la he
 * visto" es de ESTE hermano y de ESTE dispositivo, no un dato de la
 * congregación. Si se subiera, abrirla el coordinador se la escondería al
 * secretario, que es justo lo contrario de lo que hace falta.
 */
export const getSeenApplications = (): string[] => {
  try {
    const raw = localStorageGetItem(AP_APPLICATIONS_SEEN_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value) => typeof value === 'string');
  } catch {
    // Un valor corrupto no puede dejar sin avisos a nadie: se empieza de cero.
    return [];
  }
};

const saveSeenApplications = (ids: string[]) => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(AP_APPLICATIONS_SEEN_KEY, JSON.stringify(ids));
  } catch (error) {
    console.warn('[solicitudes] no se pudo guardar el visto:', error);
  }
};

export const markApplicationSeen = (request_id: string): string[] => {
  if (!request_id) return getSeenApplications();

  const current = getSeenApplications();

  if (current.includes(request_id)) return current;

  const next = [...current, request_id];
  saveSeenApplications(next);

  return next;
};

/**
 * Quita del registro las solicitudes que ya no están pendientes (aprobadas,
 * rechazadas, borradas). Sin esto la lista crecería para siempre — y, peor,
 * una solicitud borrada y vuelta a firmar con otro identificador tiene que
 * volver a avisar, cosa que hace sola al no encontrarse aquí.
 */
export const pruneSeenApplications = (
  seen: string[],
  pendingIds: string[]
): string[] => {
  const pending = new Set(pendingIds);
  const next = seen.filter((id) => pending.has(id));

  if (next.length === seen.length) return seen;

  saveSeenApplications(next);

  return next;
};
