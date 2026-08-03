import { PublishedCongregation, SchedWeekType } from '@definition/schedules';
import { monthNeedsPublishing, monthOfDate } from './month_publish';

/**
 * Borrador / publicado en los programas de reunión.
 *
 * Mismo problema que ya resolvieron Departamentos, Exhibidores y Salidas:
 * "Autocompletar" rellena un mes entero de una vez y esa propuesta salía
 * disparada a "Mis asignaciones" de cada hermano, al programa semanal y a la
 * notificación antes de que el responsable la hubiera revisado. Una propuesta
 * no es una decisión.
 *
 * Aquí hay TRES decisiones distintas, no una, porque son tres responsables
 * distintos (`isMidweekEditor`, `isWeekendEditor`, `isPublicTalkCoordinator`):
 * la reunión de entre semana, la de fin de semana y los discursos salientes.
 * Las tres viven en el mismo registro de semana (`sched`), en su parte.
 *
 * DÓNDE SE GUARDA, y por qué así. La marca NO puede ser un booleano suelto
 * dentro de la semana: `sched` se fusiona campo a campo (`syncFromRemote`), sin
 * puerta de `updatedAt` a nivel de registro, y ahí los valores primitivos los
 * gana SIEMPRE el servidor. Un dispositivo que publicara justo antes de recibir
 * una copia vieja del servidor vería cómo su "publicado" vuelve a "borrador"
 * sin decir nada — y la congregación dejaría de ver un mes que ya estaba fuera.
 * Por eso la marca tiene la misma forma que `canceled` y `week_type`, que son
 * sus vecinas y ya resuelven esto: una lista de `{ type, value, updatedAt }`,
 * que la fusión casa por `type` y decide por fecha, y gana la más reciente.
 *
 * El `type` es la vista de datos (la congregación o un grupo de idioma): cada
 * vista publica lo suyo, y no hay respaldo entre ellas a propósito — si el
 * grupo heredara el "publicado" de la congregación, un borrador del grupo se
 * vería sin que nadie lo hubiera decidido.
 */

/**
 * Desde qué mes hay que publicar a mano. Todo lo anterior cae en el histórico y
 * se da por publicado.
 *
 * Constantes en el código y no datos guardados, como en los otros módulos: así
 * todos los dispositivos deciden lo mismo sin migrar nada.
 *
 * POR QUÉ OCTUBRE (decidido el 2026-08-03, con el encargo en la mano). La regla
 * de oro es que lo que hoy se ve se siga viendo. Hoy estamos en agosto: agosto
 * está en marcha y septiembre es el mes que se está repartiendo ahora mismo y
 * que la congregación ya tiene delante, así que ninguno de los dos puede
 * volverse borrador de golpe. Octubre es el primer mes en el que el responsable
 * llega a tiempo de decidir.
 *
 * ANTES DE DESPLEGAR: si al mirar la aplicación resulta que octubre ya está
 * repartido y a la vista, sube estas constantes a '2026/11' — es un cambio de
 * una línea y no hay nada que migrar. Está en VERIFICACION-2.md.
 */
export const MIDWEEK_DRAFT_FROM = '2026/10';
export const WEEKEND_DRAFT_FROM = '2026/10';
export const OUTGOING_TALKS_DRAFT_FROM = '2026/10';

/** Los tres programas que se publican por separado. */
export type MeetingPublishKey = 'midweek' | 'weekend' | 'outgoing';

export const MEETING_DRAFT_FROM: Record<MeetingPublishKey, string> = {
  midweek: MIDWEEK_DRAFT_FROM,
  weekend: WEEKEND_DRAFT_FROM,
  outgoing: OUTGOING_TALKS_DRAFT_FROM,
};

/** Cómo se llama cada uno por escrito, para no repetir el texto en cada sitio. */
export const MEETING_PUBLISH_LABEL: Record<MeetingPublishKey, string> = {
  midweek: 'Reunión de entre semana',
  weekend: 'Reunión de fin de semana',
  outgoing: 'Discursos salientes',
};

/** ¿Hace falta publicar ese mes a mano, o cae en el histórico? */
export const meetingMonthNeedsPublishing = (
  month: string,
  key: MeetingPublishKey
) => monthNeedsPublishing(month, MEETING_DRAFT_FROM[key]);

/** La lista de marcas de ese programa dentro de la semana (puede no existir). */
const getPublishedList = (
  schedule: SchedWeekType | null | undefined,
  key: MeetingPublishKey
): PublishedCongregation[] | undefined => {
  if (!schedule) return undefined;

  if (key === 'midweek') return schedule.midweek_meeting?.published;

  if (key === 'weekend') return schedule.weekend_meeting?.published;

  return schedule.weekend_meeting?.outgoing_talks_published;
};

/** Guarda la lista en su sitio, creando la parte de la semana si hiciera falta. */
const setPublishedList = (
  schedule: SchedWeekType,
  key: MeetingPublishKey,
  list: PublishedCongregation[]
) => {
  if (key === 'midweek') {
    schedule.midweek_meeting = schedule.midweek_meeting ?? ({} as never);
    schedule.midweek_meeting.published = list;

    return;
  }

  schedule.weekend_meeting = schedule.weekend_meeting ?? ({} as never);

  if (key === 'weekend') {
    schedule.weekend_meeting.published = list;

    return;
  }

  schedule.weekend_meeting.outgoing_talks_published = list;
};

/** La marca de esa vista de datos, si existe. */
export const getMeetingPublishedEntry = (
  schedule: SchedWeekType | null | undefined,
  key: MeetingPublishKey,
  dataView: string
) =>
  (getPublishedList(schedule, key) ?? []).find(
    (record) => record?.type === dataView
  );

/**
 * ¿Está publicada esa semana?
 *
 * Una semana sin registro no está publicada, pero tampoco tiene asignaciones
 * que enseñar, así que da igual por dónde se mire.
 */
export const isMeetingWeekPublished = (
  schedule: Pick<SchedWeekType, 'weekOf' | 'midweek_meeting' | 'weekend_meeting'>
    | null
    | undefined,
  key: MeetingPublishKey,
  dataView: string
) => {
  if (!schedule?.weekOf) return false;

  if (!meetingMonthNeedsPublishing(schedule.weekOf, key)) return true;

  return (
    getMeetingPublishedEntry(schedule as SchedWeekType, key, dataView)?.value ===
    true
  );
};

/**
 * ¿Está publicada la semana de esa fecha?
 *
 * El atajo para quien solo tiene la fecha delante (las asignaciones ya
 * resueltas, las notificaciones): busca la semana y decide. Una fecha de la que
 * no hay semana guardada no puede estar publicada.
 */
export const isMeetingDatePublished = (
  schedules: SchedWeekType[],
  weekOf: string,
  key: MeetingPublishKey,
  dataView: string
) => {
  if (!meetingMonthNeedsPublishing(weekOf, key)) return true;

  const schedule = (schedules ?? []).find(
    (record) => record?.weekOf === weekOf
  );

  return isMeetingWeekPublished(schedule, key, dataView);
};

/** Las semanas guardadas que caen en ese mes (por su lunes, como el selector). */
export const meetingWeeksOfMonth = <T extends Pick<SchedWeekType, 'weekOf'>>(
  schedules: T[],
  month: string
) => {
  const normalized = monthOfDate(month);
  if (!normalized) return [];

  return (schedules ?? []).filter(
    (week) => week?.weekOf && monthOfDate(week.weekOf) === normalized
  );
};

/**
 * ¿Está publicado el mes entero?
 *
 * Con alguna semana sin publicar se responde que NO, para que el botón siga
 * ofreciendo publicar y se pueda terminar el mes; si no, quedaría a medias sin
 * que nada lo dijera.
 */
export const isMeetingMonthPublished = (
  schedules: SchedWeekType[],
  month: string,
  key: MeetingPublishKey,
  dataView: string
) => {
  // Un mes que no se entiende (todavía no hay semana elegida, por ejemplo) no
  // está publicado: así el botón sigue diciendo "Publicar" y no promete algo
  // que nadie ha hecho.
  if (!monthOfDate(month)) return false;

  if (!meetingMonthNeedsPublishing(month, key)) return true;

  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  if (weeks.length === 0) return false;

  return weeks.every(
    (week) =>
      getMeetingPublishedEntry(week, key, dataView)?.value === true
  );
};

/**
 * Devuelve las semanas del mes que hay que GUARDAR para publicarlo o retirarlo.
 *
 * Solo las que cambian: guardar un registro idéntico despierta la
 * sincronización de toda la congregación para nada (ver CLAUDE.md).
 */
export const setMeetingMonthPublished = (
  schedules: SchedWeekType[],
  month: string,
  key: MeetingPublishKey,
  published: boolean,
  dataView: string,
  updatedAt = new Date().toISOString()
): SchedWeekType[] => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  const result: SchedWeekType[] = [];

  for (const week of weeks) {
    const current = getMeetingPublishedEntry(week, key, dataView);

    if ((current?.value === true) === published) continue;

    const updated = structuredClone(week);

    const list = (getPublishedList(updated, key) ?? []).filter(
      (record) => record?.type !== dataView
    );

    list.push({ type: dataView, value: published, updatedAt });

    setPublishedList(updated, key, list);

    result.push(updated);
  }

  return result;
};

/**
 * Cuántos cambios lleva el mes desde que se publicó.
 *
 * La congregación ya vio la versión anterior, así que hay que poder decirlo. No
 * hace falta guardar nada nuevo: la propia marca de publicación lleva su
 * `updatedAt`, y cada asignación lleva el suyo, así que la cuenta sale sola.
 *
 * Se cuenta cualquier dato del programa con fecha posterior a la publicación
 * (asignaciones, tipo de semana, cancelaciones): todo eso cambia lo que el
 * hermano tiene delante. La marca de publicación no se cuenta a sí misma.
 */
export const countMeetingChangesSincePublish = (
  schedules: SchedWeekType[],
  month: string,
  key: MeetingPublishKey,
  dataView: string
) => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  let count = 0;

  for (const week of weeks) {
    const publishedAt = getMeetingPublishedEntry(week, key, dataView);

    // Semana sin publicar: lo que se haya tocado ahí no es un cambio sobre algo
    // que ya se vio.
    if (publishedAt?.value !== true || !publishedAt.updatedAt) continue;

    count += countUpdatedAfter(
      subtreeOf(week, key),
      publishedAt.updatedAt,
      dataView
    );
  }

  return count;
};

/**
 * La parte de la semana que le toca a cada programa.
 *
 * Los discursos salientes viven DENTRO de la reunión de fin de semana pero son
 * otro programa, con otro responsable y otra publicación: por eso se sacan de
 * en medio al mirar el fin de semana.
 */
const subtreeOf = (schedule: SchedWeekType, key: MeetingPublishKey) => {
  if (key === 'midweek') return schedule.midweek_meeting;

  if (key === 'outgoing') return schedule.weekend_meeting?.outgoing_talks;

  const weekend = schedule.weekend_meeting;

  if (!weekend) return weekend;

  const { outgoing_talks, ...rest } = weekend;
  void outgoing_talks;

  return rest;
};

/** Los campos con marca de publicación, que no se cuentan como cambio. */
const PUBLISH_KEYS = ['published', 'outgoing_talks_published'];

/**
 * Campos que llevan `value` + `updatedAt` pero no son una persona: el tipo de
 * semana, la cancelación, el tipo de discurso... Sin esta lista, "asignados"
 * incluiría cosas como `week_type: 'normal'` y el aviso de ausencias iría a
 * buscar la ficha de una persona llamada "normal".
 */
const NOT_A_PERSON_KEYS = [
  'week_type',
  'canceled',
  'public_talk_type',
  'aux_fsg',
];

/**
 * Cuenta los datos con `updatedAt` posterior a la referencia.
 *
 * Un "dato" es un objeto que tiene a la vez `updatedAt` y `value`: así se
 * cuentan las asignaciones y no los contenedores que las agrupan. Si lleva
 * `type`, tiene que ser el de esta vista.
 */
const countUpdatedAfter = (
  node: unknown,
  reference: string,
  dataView: string
): number => {
  if (!node || typeof node !== 'object') return 0;

  if (Array.isArray(node)) {
    let total = 0;

    for (const item of node) {
      total += countUpdatedAfter(item, reference, dataView);
    }

    return total;
  }

  const record = node as Record<string, unknown>;

  if (typeof record.updatedAt === 'string' && 'value' in record) {
    if (typeof record.type === 'string' && record.type !== dataView) return 0;

    return record.updatedAt > reference ? 1 : 0;
  }

  let total = 0;

  for (const [field, value] of Object.entries(record)) {
    if (PUBLISH_KEYS.includes(field)) continue;

    total += countUpdatedAfter(value, reference, dataView);
  }

  return total;
};

/** Una persona asignada en el mes, con la fecha de la semana en que le toca. */
export type MeetingMonthAssignee = {
  weekOf: string;
  /** El identificador de la persona (`person_uid`). */
  uid: string;
  /** El nombre tal y como quedó guardado al asignarla, si lo hay. */
  name: string;
};

/**
 * A quién se ha puesto en el mes, sin repetir el par persona + semana.
 *
 * Sirve para el aviso de ausencias: quien llama pregunta después, persona a
 * persona, si esa fecha le pilla fuera. Se queda aquí en lo puro —sin fichas de
 * personas ni traducciones— para poder probarlo.
 */
export const collectMeetingMonthAssignees = (
  schedules: SchedWeekType[],
  month: string,
  key: MeetingPublishKey,
  dataView: string
): MeetingMonthAssignee[] => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  const result: MeetingMonthAssignee[] = [];
  const seen = new Set<string>();

  for (const week of weeks) {
    for (const found of collectAssignees(subtreeOf(week, key), dataView)) {
      const fingerprint = `${week.weekOf}|${found.uid}`;

      if (seen.has(fingerprint)) continue;

      seen.add(fingerprint);
      result.push({ weekOf: week.weekOf, uid: found.uid, name: found.name });
    }
  }

  return result;
};

const collectAssignees = (
  node: unknown,
  dataView: string
): { uid: string; name: string }[] => {
  if (!node || typeof node !== 'object') return [];

  if (Array.isArray(node)) {
    return node.flatMap((item) => collectAssignees(item, dataView));
  }

  const record = node as Record<string, unknown>;

  if ('value' in record && 'updatedAt' in record) {
    // Una asignación vacía, borrada o de otra vista no cuenta.
    if (typeof record.value !== 'string' || record.value.length === 0) return [];
    if (typeof record.type === 'string' && record.type !== dataView) return [];
    if (record._deleted === true) return [];

    return [
      {
        uid: record.value,
        name:
          typeof record.name === 'string'
            ? record.name
            : typeof record.personName === 'string'
              ? record.personName
              : '',
      },
    ];
  }

  return Object.entries(record)
    .filter(
      ([field]) =>
        !PUBLISH_KEYS.includes(field) && !NOT_A_PERSON_KEYS.includes(field)
    )
    .flatMap(([, value]) => collectAssignees(value, dataView));
};
