import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { toComparableDate } from '@utils/date';

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
 * El mes del informe ('2026/07') no lleva hora y pasa igual por los dos
 * caminos.
 */
const monthOf = (date: string | null | undefined) => {
  if (typeof date !== 'string') return null;

  const month = toComparableDate(date).slice(0, 7);

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

  // Marcado como publicador pero sin ninguna fecha (alta a medio rellenar):
  // no hay nada que permita afirmar que lleva seis meses sin informar, y
  // declararlo inactivo lo sacaría de la lista donde hay que ponerle su
  // primer informe. En la duda, activo.
  return publisherStartMonths(person).length === 0;
};

export const personIsInactivePublisher = (
  person: PersonType,
  source: ReportsSource,
  month = currentActivityMonth()
) =>
  personWasPublisherBy(person, month) &&
  !personIsActivePublisher(person, source, month);

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
