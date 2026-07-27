import { TimeAwayType } from '@definition/person';
import { daysBetweenDates, toComparableDate } from '@utils/date';

/**
 * Núcleo de la vista unificada de ausencias.
 *
 * Los periodos de ausencia viven repartidos por las fichas de cada persona, y
 * hasta ahora solo se veían de uno en uno (en la ficha) o como aviso suelto al
 * asignar a alguien. Esto los junta y los clasifica para poder verlos todos a
 * la vez.
 *
 * Se mantiene puro a propósito —sin jotai, sin Dexie, sin traducciones— para
 * poder probarlo con fechas fijas: la clasificación depende de "hoy", y eso es
 * justo lo que se rompe solo con el paso del tiempo si nadie lo cubre.
 */

/**
 * Una ausencia sin fecha de vuelta y empezada hace más de esto ya no es una
 * ausencia: es que nadie la cerró. Importa porque esos periodos abiertos
 * ensucian los avisos al programar reuniones meses después ("está de ausencia
 * desde julio" en un programa de diciembre).
 */
export const OPEN_STALE_DAYS = 60;

/** Cuánto tiempo se sigue enseñando una ausencia ya terminada. */
export const PAST_WINDOW_DAYS = 90;

/**
 * Cuánto dura una ausencia. No se guarda: se deduce de las fechas, para no
 * añadir un campo nuevo a una tabla que se sincroniza con toda la
 * congregación.
 *
 * - `single`: un solo día (la vuelta es el mismo día de la salida)
 * - `until`: hasta una fecha concreta
 * - `open`: sin fecha de vuelta
 */
export type TimeAwayDuration = 'single' | 'until' | 'open';

export const getTimeAwayDuration = (
  start_date: string,
  end_date: string | null | undefined
): TimeAwayDuration => {
  if (!end_date) return 'open';

  const start = toComparableDate(start_date);
  const end = toComparableDate(end_date);

  return start && start === end ? 'single' : 'until';
};

/**
 * Cuántos días cubre la ausencia, contando los dos extremos: del 3 al 5 son
 * TRES días, no dos. Es la cuenta que hace cualquiera de cabeza, y la que hay
 * que enseñar al lado de las fechas para que se vea si están bien puestas.
 *
 * `null` si no hay vuelta o si las fechas están al revés — ahí no hay ninguna
 * cuenta que dar.
 */
export const getTimeAwayDayCount = (
  start_date: string,
  end_date: string | null | undefined
) => {
  if (!end_date) return null;

  const start = toComparableDate(start_date);
  const end = toComparableDate(end_date);

  if (!start || !end || end < start) return null;

  return daysBetweenDates(start, end) + 1;
};

export type TimeAwayStatus = 'ongoing' | 'upcoming' | 'past';

export type TimeAwayEntry = {
  /** person_uid + id del periodo: único aunque alguien repita fechas. */
  key: string;
  person_uid: string;
  start_date: string;
  /** '' cuando no se puso fecha de vuelta. */
  end_date: string;
  comments: string;
  status: TimeAwayStatus;
  /**
   * Días de calendario que faltan: para volver si está fuera, para irse si
   * aún no ha empezado. `null` en las abiertas y en las terminadas.
   */
  days: number | null;
  /** Abierta desde hace demasiado — ver OPEN_STALE_DAYS. */
  openStale: boolean;
};

export type PersonTimeAway = {
  person_uid: string;
  timeAway: TimeAwayType[];
};

const STATUS_RANK: Record<TimeAwayStatus, number> = {
  ongoing: 0,
  upcoming: 1,
  past: 2,
};

const buildEntry = (
  person_uid: string,
  record: TimeAwayType,
  today: string
): TimeAwayEntry | null => {
  const start = toComparableDate(record.start_date);

  // Sin fecha de inicio no hay periodo que enseñar. Pasa con filas a medio
  // rellenar: el editor crea la fila vacía en cuanto pulsas "Añadir".
  if (!start) return null;

  const end = toComparableDate(record.end_date);

  // Una fila con la vuelta ANTES de la salida está mal metida. Se enseña igual
  // —esconderla sería peor: nadie podría corregirla— pero como terminada, no
  // como futura: "empieza en 36 días" sobre un rango imposible manda a buscar
  // el problema al sitio equivocado.
  const inverted = !!end && end < start;

  const status: TimeAwayStatus =
    inverted || (end && end < today)
      ? 'past'
      : start > today
        ? 'upcoming'
        : 'ongoing';

  let days: number | null = null;
  if (status === 'upcoming') days = daysBetweenDates(today, start);
  if (status === 'ongoing' && end) days = daysBetweenDates(today, end);

  return {
    key: `${person_uid}:${record.id}`,
    person_uid,
    start_date: start,
    end_date: end,
    comments: record.comments ?? '',
    status,
    days,
    openStale:
      status === 'ongoing' &&
      !end &&
      daysBetweenDates(start, today) > OPEN_STALE_DAYS,
  };
};

const compareEntries = (a: TimeAwayEntry, b: TimeAwayEntry) => {
  if (a.status !== b.status) return STATUS_RANK[a.status] - STATUS_RANK[b.status];

  if (a.status === 'ongoing') {
    // Primero quien vuelve antes; las abiertas al final, que no tienen vuelta
    // conocida y no compiten con las demás.
    if (!a.end_date !== !b.end_date) return a.end_date ? -1 : 1;
    if (a.end_date !== b.end_date) return a.end_date.localeCompare(b.end_date);
  }

  if (a.status === 'upcoming' && a.start_date !== b.start_date) {
    return a.start_date.localeCompare(b.start_date);
  }

  // Terminadas: la más reciente primero.
  if (a.status === 'past' && a.end_date !== b.end_date) {
    return b.end_date.localeCompare(a.end_date);
  }

  return a.key.localeCompare(b.key);
};

/**
 * Todas las ausencias de la congregación, clasificadas y ordenadas.
 *
 * @param persons  personas con sus periodos (ya sin borradas ni archivadas)
 * @param reference fecha de referencia (se normaliza sola)
 * @param pastWindowDays  cuánto atrás se siguen enseñando las terminadas
 */
export const buildTimeAwayEntries = (
  persons: PersonTimeAway[],
  reference: string,
  pastWindowDays = PAST_WINDOW_DAYS
): TimeAwayEntry[] => {
  const entries: TimeAwayEntry[] = [];

  // Todas las fechas de los registros se normalizan; la de referencia también,
  // o una comparación de texto contra '2026-07-27' (con guiones) ordenaría al
  // revés y TODAS las ausencias saldrían como futuras.
  const today = toComparableDate(reference);

  if (!today) return entries;

  for (const person of persons) {
    for (const record of person.timeAway ?? []) {
      if (record._deleted) continue;

      const entry = buildEntry(person.person_uid, record, today);
      if (!entry) continue;

      if (
        entry.status === 'past' &&
        daysBetweenDates(entry.end_date, today) > pastWindowDays
      ) {
        continue;
      }

      entries.push(entry);
    }
  }

  return entries.sort(compareEntries);
};
