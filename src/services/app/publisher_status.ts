import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { toComparableDate } from '@utils/date';
import {
  ESTADOS_PUBLICADOR,
  findOpenPeriod,
  openPeriod,
} from '@utils/spiritual_status';

/**
 * Publicador ACTIVO o INACTIVO — fuente ÚNICA de verdad.
 *
 * La norma es la de la organización, y es una sola:
 *
 *   Un publicador está ACTIVO si ha informado participación en alguna faceta
 *   de la predicación al menos UNA VEZ en los últimos 6 meses, contando el
 *   mes en curso. Si no, está INACTIVO.
 *
 * De ahí salen dos consecuencias que conviene tener presentes:
 *
 *  - Que un mes no informe NO lo hace inactivo. Hacen falta seis meses
 *    seguidos sin informar nada.
 *  - Es automático en los dos sentidos: se queda inactivo solo, y vuelve a
 *    estar activo en cuanto entrega un informe, sin que nadie toque nada.
 *
 * Antes esto se decidía en dos sitios que se contradecían: el historial de
 * publicador de la ficha (¿tiene algún tramo abierto?) y el mes del informe
 * (¿algún tramo cubre ese mes?). Con eso, marcar a alguien inactivo cerraba
 * su tramo con fecha del mes en curso y seguía saliendo como activo en los
 * informes de ese mismo mes; y quien nunca había sido publicador aparecía en
 * la lista de "inactivos". El historial sigue siendo el registro de cuándo
 * fue nombrado publicador — pero ya no es quien decide si está activo.
 *
 * Todas las funciones son puras: reciben los informes, no los buscan. Los
 * envoltorios que leen el estado de la aplicación están en `persons.ts`.
 */

/** Meses de la ventana, contando el mes evaluado. */
export const ACTIVITY_WINDOW_MONTHS = 6;

/**
 * Meses en los que consta participación en la predicación, por persona.
 * Se construye una sola vez y se reutiliza al filtrar listas enteras.
 */
export type MinistryMonthsIndex = Map<string, Set<string>>;

export type ReportsSource = CongFieldServiceReportType[] | MinistryMonthsIndex;

/**
 * 'yyyy/MM' de una fecha guardada. Las fechas de este repo llegan en varios
 * formatos ('2026-07-01T00:00:00.000Z', '2026-07-01', '2026/07/01') y algunas
 * vienen de importaciones antiguas.
 *
 * El mes se saca con `toComparableDate`, que es donde vive la única regla
 * buena: una marca de tiempo completa se interpreta en hora LOCAL y una fecha
 * a secas se recorta. Recortar siempre el texto —como se hacía aquí— falla con
 * las fechas que la app guarda como día 1 local: en verano salen '…-30T22:00Z'
 * y el recorte las deja en el MES ANTERIOR. En la congregación había 20 así.
 *
 * El mes del informe ('2026/07') se resuelve ANTES, sin pasar por `Date`. No
 * es un adorno: `new Date('2026/07')` funciona en Chrome de casualidad, no es
 * un formato que la norma obligue a aceptar, y Safari es más estricto. Como
 * los 1.538 informes de la congregación llevan justo ese formato, un `Date`
 * inválido en iPhone dejaría el índice VACÍO — y con el índice vacío la
 * salvaguarda da por ACTIVA a la congregación entera. Un fallo silencioso y
 * total, solo en los iPhones. No se apuesta la regla a eso.
 */
const monthOf = (date: string | null | undefined) => {
  if (typeof date !== 'string') return null;

  const plain = date.trim();

  // Ya es un mes ('2026/07' o '2026-07'): no hay hora que interpretar.
  if (/^\d{4}[/-]\d{2}$/.test(plain)) return plain.replace('-', '/');

  const month = toComparableDate(plain).slice(0, 7);

  return /^\d{4}\/\d{2}$/.test(month) ? month : null;
};

/** Suma (o resta) meses a un 'yyyy/MM'. */
export const monthAdd = (month: string, value: number) => {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;

  const total = year * 12 + index + value;

  const newYear = Math.floor(total / 12);
  const newMonth = total - newYear * 12 + 1;

  return `${newYear}/${String(newMonth).padStart(2, '0')}`;
};

/** Mes en curso en 'yyyy/MM'. */
export const currentActivityMonth = (today = new Date()) => {
  const month = String(today.getMonth() + 1).padStart(2, '0');

  return `${today.getFullYear()}/${month}`;
};

/** Primer mes de la ventana que termina en `month` (incluido). */
export const activityWindowStart = (month: string) =>
  monthAdd(month, -(ACTIVITY_WINDOW_MONTHS - 1));

export const buildMinistryMonthsIndex = (
  reports: CongFieldServiceReportType[]
): MinistryMonthsIndex => {
  const index: MinistryMonthsIndex = new Map();

  for (const report of reports ?? []) {
    const data = report?.report_data;

    if (!data) continue;
    if (data._deleted) continue;

    // Sin participación no hay actividad: un informe entregado diciendo que
    // no se predicó ese mes cuenta lo mismo que no entregar nada.
    if (!data.shared_ministry) continue;

    const month = monthOf(data.report_date);
    if (!month) continue;

    const months = index.get(data.person_uid);

    if (months) months.add(month);
    else index.set(data.person_uid, new Set([month]));
  }

  return index;
};

const toIndex = (source: ReportsSource) =>
  source instanceof Map ? source : buildMinistryMonthsIndex(source);

/** ¿Está marcado HOY como publicador en su ficha? */
const isPublisherFlagged = (person: PersonType) =>
  Boolean(
    person?.person_data?.publisher_baptized?.active?.value ||
      person?.person_data?.publisher_unbaptized?.active?.value
  );

/**
 * Meses en los que empezó (o reanudó) como publicador.
 *
 * Salen del historial de publicador y, además, de la fecha de "primer
 * informe" de la ficha: al dar de alta a alguien se puede marcar la casilla
 * de publicador ANTES de ponerle ninguna fecha, y entonces el historial está
 * vacío aunque la persona ya sea publicadora.
 */
const publisherStartMonths = (person: PersonType) => {
  const history = [
    ...(person?.person_data?.publisher_baptized?.history ?? []),
    ...(person?.person_data?.publisher_unbaptized?.history ?? []),
  ];

  const months: string[] = [];

  for (const record of history) {
    if (record._deleted) continue;

    const month = monthOf(record.start_date);
    if (month) months.push(month);
  }

  const firstReport = monthOf(person?.person_data?.first_report?.value);
  if (firstReport) months.push(firstReport);

  return months;
};

/**
 * Meses de alta que dan derecho a la cortesía del recién nombrado.
 *
 * Solo cuentan los tramos ABIERTOS. Un tramo cerrado es la congregación
 * diciendo "dejó de ser publicador el día tal", y no puede a la vez servir de
 * excusa para tenerlo por activo.
 *
 * Sin esta distinción la regla se muerde la cola: al enviar el S-1 se cierra
 * el tramo de quien lleva 6 meses sin informar, pero la fecha de INICIO de ese
 * mismo tramo seguía cayendo dentro de la ventana y lo devolvía a la lista de
 * activos. Pasaba de verdad — Antonio Bernabéu, sin informar desde 2025/11,
 * salía como activo, y David Such, sin un solo informe, también.
 *
 * La fecha de "primer informe" solo se usa cuando NO hay historial: es el caso
 * del alta a medio rellenar, donde es lo único que hay.
 */
const publisherGraceMonths = (person: PersonType) => {
  const history = [
    ...(person?.person_data?.publisher_baptized?.history ?? []),
    ...(person?.person_data?.publisher_unbaptized?.history ?? []),
  ].filter((record) => !record._deleted);

  if (history.length === 0) {
    const firstReport = monthOf(person?.person_data?.first_report?.value);

    return firstReport ? [firstReport] : [];
  }

  const months: string[] = [];

  for (const record of history) {
    if (record.end_date) continue;

    const month = monthOf(record.start_date);
    if (month) months.push(month);
  }

  return months;
};

/**
 * ¿Era publicador (bautizado o no) en ese mes o antes?
 *
 * Es la puerta de entrada a todo lo demás: quien nunca ha sido publicador no
 * está activo NI inactivo, simplemente no sale en ninguna de las dos listas.
 */
export const personWasPublisherBy = (person: PersonType, month: string) => {
  const data = person?.person_data;
  if (!data) return false;

  const flagged = isPublisherFlagged(person);

  // Un estudiante de la reunión de entresemana no es publicador, aunque en su
  // día lo fuera. Si además tuviera marcada la casilla de publicador (datos
  // antiguos, las dos casillas no pueden convivir desde la ficha), manda ser
  // publicador: dejar fuera a alguien de los informes es peor.
  if (data.midweek_meeting_student?.active?.value && !flagged) return false;

  const starts = publisherStartMonths(person);

  if (starts.some((start) => start <= month)) return true;

  // Tiene fechas, pero todavía no había empezado en ese mes.
  if (starts.length > 0) return false;

  // Sin ninguna fecha: vale la casilla de la ficha (recién dado de alta).
  return flagged;
};

/**
 * ¿Queda ALGÚN informe dentro de la ventana que termina en `month`?
 *
 * Hace falta para las pantallas que miran años de servicio PASADOS. La norma de
 * conservación (`retention.ts`) borra los informes antiguos, así que la ventana
 * de un año viejo puede estar vacía; ahí `personIsActivePublisher` responde lo
 * único que puede —nadie ha informado, luego nadie está activo— y el recuento
 * sale un número inventado.
 *
 * En la congregación pasa de verdad: el informe más antiguo que se conserva es
 * de 2024/09, y la ventana del año de servicio 2024 va de 2024/03 a 2024/08. La
 * pantalla de estadísticas por año daba "2 publicadores activos" de 74. No es
 * que 72 estuvieran inactivos: es que de ese periodo ya no se sabe nada.
 *
 * Distingue DOS cosas que no son la misma:
 *
 *  - No queda ningún informe de ESA ventana, pero sí de otras → se borraron por
 *    la norma de conservación. De ese periodo no se sabe, y hay que decirlo.
 *  - No hay ningún informe de NINGÚN mes → los informes todavía no han cargado,
 *    o es un dispositivo recién instalado. Ahí se responde que sí, igual que
 *    hace la salvaguarda de `personIsActivePublisher`, para que la pantalla
 *    enseñe lo mismo que enseñaría esa. Si no, mientras cargan los informes
 *    —que van por su cuenta— el recuento del año en curso parpadearía de "sin
 *    informes" al número bueno en cada arranque.
 */
export const activityWindowHasReports = (
  source: ReportsSource,
  month = currentActivityMonth()
) => {
  const index = toIndex(source);

  if (index.size === 0) return true;

  const from = activityWindowStart(month);

  for (const months of index.values()) {
    for (const reported of months) {
      if (reported >= from && reported <= month) return true;
    }
  }

  return false;
};

/** ¿Consta participación en la predicación en algún mes de [from, to]? */
export const personReportedBetween = (
  person: PersonType,
  source: ReportsSource,
  from: string,
  to: string
) => {
  const months = toIndex(source).get(person?.person_uid);
  if (!months) return false;

  for (const month of months) {
    if (month >= from && month <= to) return true;
  }

  return false;
};

/** ¿Le nombraron publicador dentro de [from, to]? */
const startedPublishingBetween = (
  person: PersonType,
  from: string,
  to: string
) =>
  publisherGraceMonths(person).some((start) => start >= from && start <= to);

export const personIsActivePublisher = (
  person: PersonType,
  source: ReportsSource,
  month = currentActivityMonth()
) => {
  if (!personWasPublisherBy(person, month)) return false;

  const index = toIndex(source);

  // Salvaguarda: en un dispositivo recién instalado o a medio sincronizar no
  // hay informes de nadie. Sin datos no se declara inactiva a la congregación
  // entera — se da por activo a todo el que consta como publicador.
  if (index.size === 0) return true;

  const from = activityWindowStart(month);

  if (personReportedBetween(person, index, from, month)) return true;

  // Al recién nombrado todavía no le ha dado tiempo a informar: cuenta como
  // activo hasta que se le cierre su primera ventana.
  if (startedPublishingBetween(person, from, month)) return true;

  // Aquí había una última salvaguarda: "marcado como publicador pero sin
  // ninguna fecha → en la duda, activo". La duda no caducaba nunca, así que
  // quien tuviera la casilla puesta y ninguna fecha se quedaba activo PARA
  // SIEMPRE, informara o no. Rogelio Beltrán e Israel Angioli llevaban tres
  // años sin un solo informe y salían como activos.
  //
  // Ya no hace falta: marcar la casilla abre el periodo (ver
  // `openPeriod` en utils/spiritual_status), así que un alta hecha desde la
  // app siempre tiene fecha. Sin fecha y sin informes, inactivo — que además
  // es el estado donde se ve el problema y se puede arreglar.
  return false;
};

export const personIsInactivePublisher = (
  person: PersonType,
  source: ReportsSource,
  month = currentActivityMonth()
) =>
  personWasPublisherBy(person, month) &&
  !personIsActivePublisher(person, source, month);

/**
 * Pone al día el historial de publicador al enviar el S-1, en los DOS
 * sentidos: cierra el tramo de quien consta como inactivo y reabre el de quien
 * consta como activo y lo tenía cerrado.
 *
 * Antes solo cerraba, y quien volvía a informar se quedaba con el historial
 * diciendo que había dejado de ser publicador — había que arreglarlo a mano,
 * ficha por ficha, cuando la app ya sabía por sus propios informes que seguía
 * siéndolo.
 *
 * El historial no es decorativo aunque no decida quién está activo:
 * `retention.ts` lo usa para saber cuándo se BORRAN los informes de alguien,
 * así que un tramo cerrado por error le estrecha la ventana de conservación.
 *
 * Devuelve SOLO las personas que hay que guardar; a las que ya están como
 * deben no se las toca, porque guardar un registro idéntico despierta la
 * sincronización de toda la congregación para nada.
 */
export const buildPublisherHistoryUpdates = ({
  active,
  inactive,
  endDate,
  startDate,
  hasMinistryData,
}: {
  active: PersonType[];
  inactive: PersonType[];
  /** Cierre del tramo de los inactivos: último día del mes informado. */
  endDate: string;
  /** Apertura del tramo de los activos: primer día del mes informado. */
  startDate: string;
  /** ¿Hay informes cargados? Sin ellos no se toca ningún historial. */
  hasMinistryData: boolean;
}) => {
  // Sin informes cargados, `personIsActivePublisher` da a TODOS por activos
  // (salvaguarda para un dispositivo a medio sincronizar). Eso sirve para
  // pintar una pantalla, pero no para escribir: aquí abriría un tramo a media
  // congregación y el destrozo se sincronizaría a todos los dispositivos. En
  // la duda no se escribe.
  if (!hasMinistryData) return [];

  const result: PersonType[] = [];

  for (const person of inactive ?? []) {
    const newPerson = structuredClone(person);

    const abiertos = ESTADOS_PUBLICADOR.map((estado) =>
      findOpenPeriod(newPerson.person_data[estado].history)
    ).filter(Boolean);

    if (abiertos.length === 0) continue;

    for (const record of abiertos) {
      record.end_date = endDate;
      record.updatedAt = new Date().toISOString();
    }

    result.push(newPerson);
  }

  for (const person of active ?? []) {
    const yaAbierto = ESTADOS_PUBLICADOR.some((estado) =>
      findOpenPeriod(person.person_data[estado].history)
    );

    if (yaAbierto) continue;

    // De qué clase es lo dice la casilla de la ficha. Si no hay ninguna
    // puesta no se toca: no hay forma de saber qué tramo abrir.
    const estado = person.person_data.publisher_baptized?.active?.value
      ? 'publisher_baptized'
      : person.person_data.publisher_unbaptized?.active?.value
        ? 'publisher_unbaptized'
        : null;

    if (!estado) continue;

    const newPerson = structuredClone(person);

    // openPeriod nunca empieza antes de que acabe el tramo anterior, así que
    // no puede solaparse con un cierre recién escrito.
    openPeriod(newPerson.person_data[estado].history, startDate);

    result.push(newPerson);
  }

  return result;
};

/**
 * ¿Pasó a inactivo en algún mes de [startMonth, endMonth]?
 *
 * Es lo que pide el informe anual de la congregación (S-10): no cuántos están
 * inactivos hoy, sino cuántos se quedaron inactivos DURANTE ese año de
 * servicio. Se mira mes a mes el cambio de activo a inactivo, con la misma
 * regla de los 6 meses, para que el recuento anual y el del mes no puedan
 * contradecirse.
 */
export const personBecameInactiveDuring = (
  person: PersonType,
  source: ReportsSource,
  startMonth: string,
  endMonth: string
) => {
  const index = toIndex(source);

  let month = startMonth;

  while (month <= endMonth) {
    const wasActive = personIsActivePublisher(
      person,
      index,
      monthAdd(month, -1)
    );

    if (wasActive && !personIsActivePublisher(person, index, month)) {
      return true;
    }

    month = monthAdd(month, 1);
  }

  return false;
};
