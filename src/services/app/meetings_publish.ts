import { PublishedCongregation, SchedWeekType } from '@definition/schedules';
import { Week } from '@definition/week_type';
import { monthNeedsPublishing, monthOfDate } from './month_publish';
import { outgoingTalkDate } from './meeting_month';

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

/**
 * A qué mes pertenece una semana. Por su LUNES, salvo que quien llama diga otra
 * cosa.
 *
 * Se puede cambiar desde fuera porque el editor no siempre agrupa por el lunes:
 * cuando la congregación tiene puesta «fecha exacta», y siempre en el fin de
 * semana, el selector archiva cada semana por el DÍA DE LA REUNIÓN. Publicar
 * tiene que cubrir exactamente las semanas que el responsable ve bajo ese mes,
 * o se queda una fuera sin que nada lo diga. Ver `meeting_month.ts`.
 *
 * Aquí se queda el lunes como valor por defecto para que este módulo siga
 * siendo puro y se pueda probar sin navegador ni ajustes.
 */
export type MeetingWeekMonth = (weekOf: string) => string;

/** Las semanas guardadas que caen en ese mes. */
export const meetingWeeksOfMonth = <T extends Pick<SchedWeekType, 'weekOf'>>(
  schedules: T[],
  month: string,
  monthOf: MeetingWeekMonth = monthOfDate
) => {
  const normalized = monthOfDate(month);
  if (!normalized) return [];

  return (schedules ?? []).filter(
    (week) => week?.weekOf && monthOf(week.weekOf) === normalized
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
  dataView: string,
  monthOf: MeetingWeekMonth = monthOfDate
) => {
  // Un mes que no se entiende (todavía no hay semana elegida, por ejemplo) no
  // está publicado: así el botón sigue diciendo "Publicar" y no promete algo
  // que nadie ha hecho.
  if (!monthOfDate(month)) return false;

  if (!meetingMonthNeedsPublishing(month, key)) return true;

  const weeks = meetingWeeksOfMonth(schedules ?? [], month, monthOf);

  if (weeks.length === 0) return false;

  // Se pregunta semana a semana con la MISMA función que decide si el hermano
  // la ve, y no mirando la marca a pelo. Importa desde que un mes agrupa por el
  // día de la reunión: septiembre contiene la semana del 31 de agosto, que cae
  // en el histórico y se ve sin marca ninguna. Mirando solo la marca, ese mes
  // no podría decir «Publicado» jamás, por mucho que se publicara todo.
  return weeks.every((week) => isMeetingWeekPublished(week, key, dataView));
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
  updatedAt = new Date().toISOString(),
  monthOf: MeetingWeekMonth = monthOfDate
): SchedWeekType[] => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month, monthOf);

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
  updatedAt = new Date().toISOString(),
  monthOf: MeetingWeekMonth = monthOfDate
): SchedWeekType[] => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month, monthOf);

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
  dataView: string,
  monthOf: MeetingWeekMonth = monthOfDate
) => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month, monthOf);

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

    // LA HOJITA NO ES UN CAMBIO DEL PROGRAMA. Marcar que un hermano ha
    // confirmado su S-89 sella `updatedAt` como cualquier otra edición —tiene
    // que hacerlo, o la marca no ganaría la fusión y no llegaría a los demás
    // dispositivos—, y por eso salía «has hecho 3 cambios desde entonces» solo
    // por ir poniendo tics.
    //
    // Pero eso no cambia nada de lo que el resto de la congregación tiene
    // delante: a quién se le ha entregado la hojita solo nos importa a quienes
    // repartimos las asignaciones. Contarlo empujaba a volver a publicar un mes
    // que en realidad no había cambiado.
    //
    // Si las dos fechas coinciden, el último toque de esta asignación fue la
    // confirmación. En cuanto se edite cualquier otra cosa, `updatedAt` avanza,
    // dejan de coincidir y ese cambio sí se cuenta.
    if (
      typeof record.confirmedAt === 'string' &&
      record.confirmedAt === record.updatedAt
    ) {
      return 0;
    }

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
type EssentialPart = { id: string; path: string[]; label: string };

/**
 * Lo que en esta congregación se resuelve SIN apuntarlo en la semana.
 *
 * Dos partes del fin de semana pueden estar legítimamente en blanco, y sin
 * saberlo el aviso de «le falta alguien» miente en todas las semanas — que es
 * peor que no avisar: un aviso que siempre sale deja de leerse, y con él se van
 * los que sí importan.
 */
export type MeetingPartsContext = {
  /**
   * Hay un conductor de La Atalaya fijo en Ajustes. Cuando nadie pone otro a
   * mano, la reunión lo tiene igual: el hueco vacío no es un hueco.
   */
  wtConductorPorDefecto?: boolean;
  /**
   * «La oración del fin de semana se asigna sola»: la lleva quien preside y no
   * se apunta. Con eso puesto, la casilla ni siquiera se enseña en pantalla.
   */
  oracionFinDeSemanaAutomatica?: boolean;
};

/** Las partes que de verdad hay que mirar, quitando las que se resuelven solas. */
const partesExigibles = (
  key: MeetingPublishKey,
  contexto: MeetingPartsContext = {}
) => {
  if (key === 'midweek') return MIDWEEK_ESSENTIAL_PARTS;

  return WEEKEND_ESSENTIAL_PARTS.filter((part) => {
    if (part.id === 'wt_conductor' && contexto.wtConductorPorDefecto) {
      return false;
    }

    if (part.id === 'opening_prayer' && contexto.oracionFinDeSemanaAutomatica) {
      return false;
    }

    return true;
  });
};

const MIDWEEK_ESSENTIAL_PARTS: EssentialPart[] = [
  { id: 'chairman', path: ['chairman', 'main_hall'], label: 'Presidente' },
  {
    id: 'opening_prayer',
    path: ['opening_prayer'],
    label: 'Oración de apertura',
  },
  { id: 'tgw_talk', path: ['tgw_talk'], label: 'Tesoros de la Biblia' },
  { id: 'tgw_gems', path: ['tgw_gems'], label: 'Busquemos perlas escondidas' },
  {
    id: 'bible_reading',
    path: ['tgw_bible_reading', 'main_hall'],
    label: 'Lectura de la Biblia',
  },
  {
    id: 'cbs_conductor',
    path: ['lc_cbs', 'conductor'],
    label: 'Conductor del estudio bíblico',
  },
  {
    id: 'cbs_reader',
    path: ['lc_cbs', 'reader'],
    label: 'Lector del estudio bíblico',
  },
  {
    id: 'closing_prayer',
    path: ['closing_prayer'],
    label: 'Oración de conclusión',
  },
];

const WEEKEND_ESSENTIAL_PARTS: EssentialPart[] = [
  { id: 'chairman', path: ['chairman'], label: 'Presidente' },
  { id: 'opening_prayer', path: ['opening_prayer'], label: 'Oración' },
  { id: 'speaker', path: ['speaker', 'part_1'], label: 'Orador' },
  {
    id: 'wt_conductor',
    path: ['wt_study', 'conductor'],
    label: 'Conductor de La Atalaya',
  },
  {
    id: 'wt_reader',
    path: ['wt_study', 'reader'],
    label: 'Lector de La Atalaya',
  },
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
  dataView: string,
  monthOf: MeetingWeekMonth = monthOfDate,
  contexto: MeetingPartsContext = {}
) => {
  if (key === 'outgoing') return 0;

  const weeks = meetingWeeksOfMonth(schedules ?? [], month, monthOf);

  const parts = partesExigibles(key, contexto);

  let count = 0;

  for (const week of weeks) {
    const meeting =
      key === 'midweek' ? week.midweek_meeting : week.weekend_meeting;

    if (!meeting) continue;

    if (valueAt(meeting, ['canceled'], dataView) === true) continue;

    const weekType = valueAt(meeting, ['week_type'], dataView);

    // Sin tipo de semana guardado se da por normal, que es lo que es.
    if (weekType !== undefined && weekType !== Week.NORMAL) continue;

    for (const part of parts) {
      const value = valueAt(meeting, part.path, dataView);

      if (typeof value !== 'string' || value.length === 0) count++;
    }
  }

  return count;
};

/**
 * Qué le falta a UNA semana, con nombre y apellidos.
 *
 * El diálogo de publicar ya decía cuántas partes faltaban en todo lo marcado,
 * y ese número no sirve para actuar: «faltan 3 partes» no dice en qué semana ni
 * cuál. Aquí se contesta lo que el responsable se pregunta de verdad antes de
 * darle al botón — «¿esta semana está entera?, y si no, qué le falta».
 *
 * Una semana cancelada, de asamblea o de visita del superintendente devuelve la
 * lista vacía: esas partes no existen esa semana, y decir que «faltan» sería
 * mentir. Lo mismo una semana que todavía no está guardada.
 */
export const buildMeetingWeekMissingParts = (
  schedule:
    | Pick<SchedWeekType, 'weekOf' | 'midweek_meeting' | 'weekend_meeting'>
    | null
    | undefined,
  key: MeetingPublishKey,
  dataView: string,
  contexto: MeetingPartsContext = {}
): string[] => {
  if (!schedule || key === 'outgoing') return [];

  const meeting =
    key === 'midweek' ? schedule.midweek_meeting : schedule.weekend_meeting;

  if (!meeting) return [];

  if (valueAt(meeting, ['canceled'], dataView) === true) return [];

  const weekType = valueAt(meeting, ['week_type'], dataView);

  // Sin tipo de semana guardado se da por normal, que es lo que es.
  if (weekType !== undefined && weekType !== Week.NORMAL) return [];

  const parts = partesExigibles(key, contexto);

  return parts
    .filter((part) => {
      const value = valueAt(meeting, part.path, dataView);

      return typeof value !== 'string' || value.length === 0;
    })
    .map((part) => part.label);
};

/**
 * ¿Está la semana sin empezar — todas sus partes principales vacías?
 *
 * Se pregunta aparte de la lista de lo que falta porque la respuesta se dice
 * distinta: enumerar las ocho partes de una semana en blanco es una pared de
 * texto que no ayuda; «sin empezar» sí.
 *
 * Una semana que no reclama nada (cancelada, asamblea, visita) NO está sin
 * empezar: es que no hay nada que poner.
 */
export const isMeetingWeekUntouched = (
  schedule:
    | Pick<SchedWeekType, 'weekOf' | 'midweek_meeting' | 'weekend_meeting'>
    | null
    | undefined,
  key: MeetingPublishKey,
  dataView: string,
  contexto: MeetingPartsContext = {}
) => {
  const missing = buildMeetingWeekMissingParts(
    schedule,
    key,
    dataView,
    contexto
  );

  if (missing.length === 0) return false;

  return missing.length === partesExigibles(key, contexto).length;
};

/**
 * Publica o retira SEMANAS sueltas. Devuelve solo las que hay que guardar.
 *
 * El mes dejó de ser la unidad de la decisión: el responsable termina el
 * programa semana a semana y a veces quiere soltar las dos primeras mientras
 * sigue con el resto. Los datos ya eran así —la marca vive dentro de cada
 * semana—, así que esto no añade una capa, quita una.
 *
 * Y de paso desaparece la pregunta de a qué mes pertenece una semana a caballo:
 * aquí no hay meses, hay semanas.
 *
 * Una semana anterior al corte se salta: cae en el histórico, ya se da por
 * publicada y escribirle una marca sería tocar un registro para nada — y en
 * este repositorio guardar un registro idéntico despierta la sincronización de
 * toda la congregación.
 */
export const setMeetingWeeksPublished = (
  schedules: SchedWeekType[],
  weekOfs: string[],
  key: MeetingPublishKey,
  published: boolean,
  dataView: string,
  updatedAt = new Date().toISOString()
): SchedWeekType[] => {
  const wanted = new Set(weekOfs ?? []);

  const result: SchedWeekType[] = [];

  for (const week of schedules ?? []) {
    if (!week?.weekOf || !wanted.has(week.weekOf)) continue;

    if (!meetingMonthNeedsPublishing(week.weekOf, key)) continue;

    const current = getMeetingPublishedEntry(week, key, dataView);

    // Ya está como debe: no se vuelve a guardar.
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
 * Vuelve a sellar la fecha de semanas ya publicadas.
 *
 * El equivalente por semanas de `restampMeetingMonthPublished`: no cambia si
 * están publicadas —ya lo están—, solo pone la fecha al día para poder cerrar
 * el aviso de «has cambiado N cosas desde entonces».
 */
export const restampMeetingWeeksPublished = (
  schedules: SchedWeekType[],
  weekOfs: string[],
  key: MeetingPublishKey,
  dataView: string,
  updatedAt = new Date().toISOString()
): SchedWeekType[] => {
  const wanted = new Set(weekOfs ?? []);

  const result: SchedWeekType[] = [];

  for (const week of schedules ?? []) {
    if (!week?.weekOf || !wanted.has(week.weekOf)) continue;

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
  dataView: string,
  monthOf: MeetingWeekMonth = monthOfDate
): OutgoingMonthGaps => {
  const weeks = meetingWeeksOfMonth(schedules ?? [], month, monthOf);

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
  /**
   * Cómo se llama la parte que lleva: «Lectura de la Biblia».
   *
   * Hace falta para que el aviso de ausencias sirva de algo. Decir «tiene una
   * asignación un día que está ausente» sin decir cuál ni cuándo obliga a
   * repasar el mes entero a mano, que es justo el trabajo que se venía a
   * ahorrar.
   */
  parte: string;
  /**
   * El día exacto, cuando no es el de nuestra reunión.
   *
   * Solo lo llevan los discursos SALIENTES: el hermano no habla aquí, habla en
   * la congregación que le recibe, y esa puede tener la reunión el sábado
   * cuando aquí es el domingo. Quien lee esto pregunta por esta fecha si la
   * hay, y si no, por la de nuestra reunión.
   */
  fecha?: string;
};

/**
 * El nombre de cada parte, por la clave con la que vive en la semana.
 *
 * Se queda en el primer nivel a propósito: a quien lee el aviso le da igual si
 * fue en la sala principal o en el aula auxiliar — lo que necesita es saber a
 * qué parte ir.
 */
const PART_LABEL: Record<string, string> = {
  chairman: 'Presidente',
  opening_prayer: 'Oración de apertura',
  tgw_talk: 'Tesoros de la Biblia',
  tgw_gems: 'Busquemos perlas escondidas',
  tgw_bible_reading: 'Lectura de la Biblia',
  ayf_part1: 'Seamos mejores maestros (parte 1)',
  ayf_part2: 'Seamos mejores maestros (parte 2)',
  ayf_part3: 'Seamos mejores maestros (parte 3)',
  ayf_part4: 'Seamos mejores maestros (parte 4)',
  lc_part1: 'Nuestra vida cristiana (parte 1)',
  lc_part2: 'Nuestra vida cristiana (parte 2)',
  lc_part3: 'Nuestra vida cristiana (parte 3)',
  lc_cbs: 'Estudio bíblico de la congregación',
  closing_prayer: 'Oración de conclusión',
  circuit_overseer: 'Superintendente de circuito',
  speaker: 'Discurso público',
  wt_study: 'Estudio de La Atalaya',
  outgoing_talks: 'Discurso saliente',
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
  dataView: string,
  monthOf: MeetingWeekMonth = monthOfDate
): MeetingMonthAssignee[] =>
  collectAssigneesOfWeeks(
    meetingWeeksOfMonth(schedules ?? [], month, monthOf),
    key,
    dataView
  );

/** Lo mismo, pero para una lista de semanas sueltas. */
export const collectMeetingWeeksAssignees = (
  schedules: SchedWeekType[],
  weekOfs: string[],
  key: MeetingPublishKey,
  dataView: string
): MeetingMonthAssignee[] => {
  const wanted = new Set(weekOfs ?? []);

  return collectAssigneesOfWeeks(
    (schedules ?? []).filter((week) => week?.weekOf && wanted.has(week.weekOf)),
    key,
    dataView
  );
};

const collectAssigneesOfWeeks = (
  weeks: SchedWeekType[],
  key: MeetingPublishKey,
  dataView: string
): MeetingMonthAssignee[] => {
  const result: MeetingMonthAssignee[] = [];
  const seen = new Set<string>();

  for (const week of weeks) {
    const subtree = subtreeOf(week, key) as Record<string, unknown> | undefined;

    if (!subtree) continue;

    // Se recorre parte por parte y no el subárbol entero de una vez: así se
    // sabe DE QUÉ parte sale cada persona, que es lo que el aviso necesita
    // decir. La clave del primer nivel es la parte.
    //
    // Los discursos SALIENTES son la excepción: ahí el subárbol es una lista de
    // salidas, no partes con nombre, y recorrerlo igual daría «parte 0», «parte
    // 1». Todas son lo mismo y se llaman igual.
    // Y cada salida se recorre por separado, aunque todas se llamen igual,
    // porque cada una va a una congregación distinta y por tanto cae en un día
    // distinto. Si se metieran todas en el mismo saco no habría forma de saber
    // qué día preguntar por cada hermano.
    const partes: [string, unknown][] = Array.isArray(subtree)
      ? subtree.map((salida) => ['outgoing_talks', salida] as [string, unknown])
      : Object.entries(subtree);

    for (const [campo, nodo] of partes) {
      if (PUBLISH_KEYS.includes(campo) || NOT_A_PERSON_KEYS.includes(campo)) {
        continue;
      }

      const fecha =
        campo === 'outgoing_talks'
          ? outgoingTalkDate(
              week.weekOf,
              (nodo as { congregation?: { weekday?: number } })?.congregation
                ?.weekday
            )
          : '';

      for (const found of collectAssignees(nodo, dataView)) {
        // Una persona puede salir dos veces en la misma parte (sala principal
        // y aula auxiliar); una vez por parte basta.
        const fingerprint = `${week.weekOf}|${found.uid}|${campo}|${fecha}`;

        if (seen.has(fingerprint)) continue;

        seen.add(fingerprint);
        result.push({
          weekOf: week.weekOf,
          uid: found.uid,
          name: found.name,
          parte: PART_LABEL[campo] ?? campo,
          ...(fecha.length > 0 && { fecha }),
        });
      }
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
