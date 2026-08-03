import { PublishedCongregation, SchedWeekType } from '@definition/schedules';
import { Week } from '@definition/week_type';
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
 * POR QUÉ SEPTIEMBRE (bajado el 2026-08-03, el mismo día, mirando la aplicación
 * de verdad). El corte nació en octubre por prudencia: se dio por hecho que
 * septiembre ya estaba repartido y a la vista, y la regla de oro es que lo que
 * hoy se ve se siga viendo. Al mirarlo resultó lo contrario: el responsable de
 * la reunión de entre semana había hecho septiembre entero y NO le había dado a
 * publicar — y aun así el programa le salía a la congregación, porque el mes
 * caía por debajo del corte. Justo lo que este encargo venía a evitar.
 *
 * Así que el corte baja al mes que de verdad está sin confirmar. Agosto se
 * queda fuera y no se toca: está en marcha, las reuniones son estas semanas y
 * esconderlo sí sería quitar de en medio algo que la congregación ya usa.
 *
 * Septiembre es además el corte que ya tenían Exhibidores y Salidas
 * (`EXHIBITORS_DRAFT_FROM`, `OUTINGS_DRAFT_FROM`), así que los cinco módulos
 * empiezan a pedir publicación el mismo mes.
 *
 * LO QUE ESTO PIDE A CAMBIO: septiembre pasa a ser un borrador hasta que cada
 * responsable le dé a «Publicar». Mientras no lo haga, la congregación no lo ve
 * — que es el comportamiento pedido, pero hay que darle al botón.
 */
export const MIDWEEK_DRAFT_FROM = '2026/09';
export const WEEKEND_DRAFT_FROM = '2026/09';
export const OUTGOING_TALKS_DRAFT_FROM = '2026/09';

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

/**
 * A qué programa pertenece una asignación, por su clave.
 *
 * Las claves de las partes empiezan por `MM_` (entre semana) o `WM_` (fin de
 * semana), menos una: `WM_Speaker_Outgoing` vive en el registro del fin de
 * semana pero es un discurso SALIENTE, que se publica por su cuenta. Sin esta
 * excepción, publicar la reunión de fin de semana enseñaría también las salidas
 * que el coordinador todavía no ha confirmado.
 */
export const meetingPublishKeyOfAssignment = (
  key: string | undefined
): MeetingPublishKey => {
  if (key === 'WM_Speaker_Outgoing') return 'outgoing';

  return key?.startsWith('MM_') ? 'midweek' : 'weekend';
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
  schedule:
    | Pick<SchedWeekType, 'weekOf' | 'midweek_meeting' | 'weekend_meeting'>
    | null
    | undefined,
  key: MeetingPublishKey,
  dataView: string
) => {
  if (!schedule?.weekOf) return false;

  if (!meetingMonthNeedsPublishing(schedule.weekOf, key)) return true;

  return (
    getMeetingPublishedEntry(schedule as SchedWeekType, key, dataView)
      ?.value === true
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
    (week) => getMeetingPublishedEntry(week, key, dataView)?.value === true
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
 * Vuelve a sellar la fecha de publicación de un mes ya publicado.
 *
 * Es lo que hace "Volver a publicar" cuando se ha cambiado algo de un mes que
 * la congregación ya vio: no cambia si está publicado o no —ya lo está—, pero
 * pone la fecha al día, que es la referencia contra la que se cuentan los
 * cambios. Sin esto, el aviso de "has cambiado N cosas desde entonces" no se
 * podría cerrar nunca.
 *
 * Solo devuelve las semanas que están publicadas: una que no lo esté no tiene
 * nada que volver a publicar, y escribirla sería despertar la sincronización de
 * toda la congregación para nada.
 */
export const restampMeetingMonthPublished = (
  schedules: SchedWeekType[],
  month: string,
  key: MeetingPublishKey,
  dataView: string,
  updatedAt = new Date().toISOString()
): SchedWeekType[] => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  const result: SchedWeekType[] = [];

  for (const week of weeks) {
    const current = getMeetingPublishedEntry(week, key, dataView);

    if (current?.value !== true) continue;

    const updated = structuredClone(week);

    const list = (getPublishedList(updated, key) ?? []).map((record) =>
      record?.type === dataView ? { ...record, updatedAt } : record
    );

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

/**
 * Las partes que en una semana normal SIEMPRE tienen que llevar a alguien.
 *
 * A propósito no es "todo lo que hay en el registro": el esquema crea de
 * antemano todos los huecos posibles —las dos aulas auxiliares, las cuatro
 * partes de "Seamos mejores maestros"— y la mayoría no existen esa semana. Un
 * aviso que dijera "faltan 47 puestos" en un mes terminado no lo leería nadie
 * dos veces. Estas son las que se notan si faltan.
 */
const MIDWEEK_ESSENTIAL_PARTS = [
  ['chairman', 'main_hall'],
  ['opening_prayer'],
  ['tgw_talk'],
  ['tgw_gems'],
  ['tgw_bible_reading', 'main_hall'],
  ['lc_cbs', 'conductor'],
  ['lc_cbs', 'reader'],
  ['closing_prayer'],
];

const WEEKEND_ESSENTIAL_PARTS = [
  ['chairman'],
  ['opening_prayer'],
  ['speaker', 'part_1'],
  ['wt_study', 'conductor'],
  ['wt_study', 'reader'],
];

const valueAt = (node: unknown, path: string[], dataView: string) => {
  let current: unknown = node;

  for (const step of path) {
    if (!current || typeof current !== 'object') return undefined;

    current = (current as Record<string, unknown>)[step];
  }

  if (Array.isArray(current)) {
    current = current.find(
      (item) => (item as { type?: string })?.type === dataView
    );
  }

  if (!current || typeof current !== 'object') return undefined;

  return (current as { value?: unknown }).value;
};

/**
 * ¿Cuántas partes principales del mes están sin nadie?
 *
 * No impide publicar —el resto del mes puede estar decidido—, pero se dice.
 *
 * Solo cuenta las semanas NORMALES y no canceladas: en una semana de asamblea o
 * de visita del superintendente esas partes no existen, y contarlas como
 * "faltan" sería ruido.
 */
export const countMeetingMissingParts = (
  schedules: SchedWeekType[],
  month: string,
  key: MeetingPublishKey,
  dataView: string
) => {
  if (key === 'outgoing') return 0;

  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  const parts =
    key === 'midweek' ? MIDWEEK_ESSENTIAL_PARTS : WEEKEND_ESSENTIAL_PARTS;

  let count = 0;

  for (const week of weeks) {
    const meeting =
      key === 'midweek' ? week.midweek_meeting : week.weekend_meeting;

    if (!meeting) continue;

    if (valueAt(meeting, ['canceled'], dataView) === true) continue;

    const weekType = valueAt(meeting, ['week_type'], dataView);

    // Sin tipo de semana guardado se da por normal, que es lo que es.
    if (weekType !== undefined && weekType !== Week.NORMAL) continue;

    for (const path of parts) {
      const value = valueAt(meeting, path, dataView);

      if (typeof value !== 'string' || value.length === 0) count++;
    }
  }

  return count;
};

/**
 * Lo que le falta a un mes de discursos salientes.
 *
 * Aquí no vale el aviso de "puestos sin nadie" de los otros módulos: una salida
 * existe porque alguien la ha creado, no porque el calendario la reclame. Lo
 * que sí se puede decir, y es justo lo que se escapa:
 *
 * - `withoutSpeaker`: la salida no tiene orador.
 * - `withoutTalk`: no tiene discurso asignado.
 * - `withoutCongregation`: no se sabe a qué congregación va — y como la FECHA
 *   de la salida sale del día de reunión de esa congregación, sin ella tampoco
 *   hay fecha. Es lo más parecido a "sin fecha confirmada" que existe en los
 *   datos: no hay ningún campo de confirmación (`synced` significa otra cosa,
 *   que la salida la mandó la otra congregación).
 */
export type OutgoingMonthGaps = {
  total: number;
  withoutSpeaker: number;
  withoutTalk: number;
  withoutCongregation: number;
};

export const buildOutgoingMonthGaps = (
  schedules: SchedWeekType[],
  month: string,
  dataView: string
): OutgoingMonthGaps => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month);

  const gaps: OutgoingMonthGaps = {
    total: 0,
    withoutSpeaker: 0,
    withoutTalk: 0,
    withoutCongregation: 0,
  };

  for (const week of weeks) {
    const talks = week.weekend_meeting?.outgoing_talks ?? [];

    for (const talk of talks) {
      if (!talk || talk._deleted) continue;
      if (talk.type && talk.type !== dataView) continue;

      gaps.total++;

      if (!talk.value) gaps.withoutSpeaker++;

      if (talk.public_talk === null || talk.public_talk === undefined) {
        gaps.withoutTalk++;
      }

      if (!talk.congregation?.name) gaps.withoutCongregation++;
    }
  }

  return gaps;
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
    if (typeof record.value !== 'string' || record.value.length === 0)
      return [];
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
