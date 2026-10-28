import { localStorageGetItem } from '@utils/common';
import type { APRecordType } from '@definition/ministry';

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
 *
 * SIN NADA PENDIENTE NO SE LIMPIA NADA, y esa guarda es el meollo: al abrir
 * la aplicación las solicitudes todavía no han bajado del servidor, así que
 * la lista de pendientes está vacía por no haber llegado, no por no haber
 * ninguna. Limpiar contra esa lista vacía borraba el registro ENTERO en cada
 * arranque, y el aviso volvía a salir cada vez que se abría la aplicación por
 * mucho que se hubiera entrado a verlo.
 *
 * Desde aquí no hay manera de distinguir "todavía no ha llegado" de "no hay
 * ninguna", así que se elige el lado que no pierde nada: mientras no haya
 * pendientes el registro se queda como está, y se limpia en cuanto vuelva a
 * haber alguna. Lo que sobre entretanto son unos pocos identificadores
 * guardados de más, que no molestan a nadie.
 */
export const pruneSeenApplications = (
  seen: string[],
  pendingIds: string[]
): string[] => {
  if (pendingIds.length === 0) return seen;

  const pending = new Set(pendingIds);
  const next = seen.filter((id) => pending.has(id));

  if (next.length === seen.length) return seen;

  saveSeenApplications(next);

  return next;
};

/** Los tres papeles que firman una solicitud de precursor auxiliar. */
export const PAPELES_DEL_COMITE = [
  'coordinator',
  'secretary',
  'service_overseer',
] as const;

type PapelDelComite = (typeof PAPELES_DEL_COMITE)[number];

type SolicitudAviso = Pick<
  APRecordType,
  'request_id' | 'person_uid' | 'months' | 'continuous'
> &
  Partial<Record<PapelDelComite, 'waiting' | 'approved' | 'rejected'>>;

type PersonaAviso = {
  person_uid: string;
  person_data: {
    enrollments?: {
      enrollment: string;
      start_date: string | null;
      end_date: string | null;
      _deleted?: boolean;
    }[];
  };
};

/** 'YYYY/MM' de una fecha guardada como 'yyyy/MM/dd' o ISO. */
const mesDeFecha = (fecha: string | null | undefined): string | null => {
  if (!fecha || fecha.length < 7) return null;
  return fecha.slice(0, 7).replace('-', '/');
};

/** ¿La persona ya consta como precursor auxiliar en ESE mes? */
const inscritaEnElMes = (persona: PersonaAviso | undefined, mes: string) =>
  (persona?.person_data.enrollments ?? []).some((registro) => {
    if (registro._deleted || registro.enrollment !== 'AP') return false;

    const desde = mesDeFecha(registro.start_date);
    if (!desde || desde > mes) return false;

    const hasta = mesDeFecha(registro.end_date);
    return !hasta || hasta >= mes;
  });

/**
 * Qué solicitudes pendientes merecen salir en la campana de ESTA persona.
 *
 * Antes salían todas las pendientes que no se hubieran abierto en este
 * dispositivo. Y «pendiente» quiere decir que alguno de los tres del comité
 * todavía no ha pulsado aprobar: en cuanto uno no usa la app, o se resuelve
 * de palabra, la solicitud se queda pendiente para siempre. Con el «visto»
 * guardado solo en el móvil, cada vez que alguien volvía a entrar en su
 * cuenta le volvían a salir todas, aunque él ya hubiera hecho su parte.
 *
 * Ahora no avisa de una solicitud:
 * - que ya se ha visto o se ha quitado del aviso;
 * - en la que esta persona ya ha dicho lo suyo (aprobado o rechazado en su
 *   papel del comité): lo que falta es de otro, y a ese otro sí le avisa;
 * - cuyos meses ya han pasado todos (si no es continua): ya no hay nada que
 *   decidir;
 * - si el hermano ya consta como precursor auxiliar en todos los meses que
 *   pide: se resolvió por otro camino, apuntándolo en su ficha.
 *
 * Un administrador que no está en el comité no tiene papel propio: para él
 * cuenta cualquier papel que falte, como hasta ahora.
 */
export const solicitudesQueAvisan = <T extends SolicitudAviso>({
  solicitudes,
  vistas,
  misPapeles,
  personas,
  hoy = new Date(),
}: {
  solicitudes: T[];
  vistas: string[];
  misPapeles: string[];
  personas: PersonaAviso[];
  hoy?: Date;
}): T[] => {
  const vistasSet = new Set(vistas);
  const mesActual = `${hoy.getFullYear()}/${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const papeles = PAPELES_DEL_COMITE.filter((papel) =>
    misPapeles.includes(papel)
  );

  return solicitudes.filter((solicitud) => {
    if (vistasSet.has(solicitud.request_id)) return false;

    const pendientePara = papeles.length > 0 ? papeles : PAPELES_DEL_COMITE;
    const faltaLoMio = pendientePara.some(
      (papel) => (solicitud[papel] ?? 'waiting') === 'waiting'
    );
    if (!faltaLoMio) return false;

    const meses = (Array.isArray(solicitud.months) ? solicitud.months : [])
      .filter((mes) => /^\d{4}\/\d{2}$/.test(mes))
      .sort();

    if (
      !solicitud.continuous &&
      meses.length > 0 &&
      meses.at(-1)! < mesActual
    ) {
      return false;
    }

    const persona = personas.find(
      (registro) => registro.person_uid === solicitud.person_uid
    );

    if (
      meses.length > 0 &&
      meses.every((mes) => inscritaEnElMes(persona, mes))
    ) {
      return false;
    }

    return true;
  });
};
