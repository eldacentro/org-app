import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { PersonType } from '@definition/person';

/**
 * Informes que se meten DESPUÉS de haber enviado el S-1 de su mes.
 *
 * Un mes enviado a la sucursal queda cerrado: sus informes ya no se tocan,
 * porque lo que se mandó tiene que seguir cuadrando con lo que hay. Un informe
 * que entra después puede ser dos cosas muy distintas, y la app solo
 * contemplaba la primera:
 *
 *  - ATRASADO: un publicador de ESTA congregación que no lo entregó a tiempo.
 *    Se anota en su tarjeta en el mes que le corresponde y se suma al
 *    SIGUIENTE informe a la sucursal, que es la norma.
 *
 *  - SOLO PARA SU TARJETA: meses que ya contó otro. El caso típico es quien
 *    llega trasladado: se le copia la tarjeta que manda su congregación
 *    anterior, y esos meses ya los mandó aquella. Sumarlos aquí los cuenta dos
 *    veces.
 *
 * Como la única manera de desbloquear un mes enviado era marcar «Informe
 * atrasado», el historial de los recién llegados entraba como atrasado y se
 * sumaba al S-1 siguiente. En octubre de 2026 eso infló el S-1 en 4
 * publicadores (Andrus e Ingrid Fernández, agosto y septiembre) y 2
 * auxiliares (Mírian y Roberto Hernández, agosto): 38/26/22 donde TsWin daba
 * 34/24/22.
 *
 * Se guarda en el `late` de siempre:
 *
 *   { value: false }                                  → normal, de su mes
 *   { value: true, submitted: '' }                    → atrasado pendiente
 *   { value: true, submitted: 'yyyy/MM' }             → salió con ese S-1
 *   { value: true, submitted: <su mes>, record_only } → solo para su tarjeta
 *
 * El de la tarjeta lleva en `submitted` SU PROPIO MES a propósito, por los
 * móviles que aún tengan la versión anterior: la leen como «ya enviado» y no la
 * suman a nada, que es lo correcto; y es una fecha válida, así que su editor de
 * la tarjeta no revienta al pintarla (con un texto cualquiera, `formatDate`
 * lanza «Invalid time value»). Aquí manda `record_only`, que se mira primero.
 */

export type LateState = 'on_time' | 'pending' | 'sent' | 'record_only';

type Late = CongFieldServiceReportType['report_data']['late'];

type LateCarrier = {
  report_data: Pick<CongFieldServiceReportType['report_data'], 'late'>;
};

const MONTH = /^\d{4}\/\d{2}$/;

/**
 * Del 1 de agosto al 9 de noviembre de 2026, el informe que mandaba el propio
 * publicador con su mes ya enviado se guardaba con la HORA de llegada en
 * `submitted` ('2026-11-01T10:36:…'), no con un mes.
 */
const isLegacyArrivalMark = (late: Late | undefined) => {
  if (!late?.value || late.record_only) return false;

  const submitted = (late.submitted ?? '').trim();

  return submitted.length > 0 && !MONTH.test(submitted);
};

export const lateStateOf = (report: LateCarrier | undefined): LateState => {
  const late = report?.report_data?.late;

  if (!late?.value) return 'on_time';

  if (late.record_only) return 'record_only';

  const submitted = (late.submitted ?? '').trim();

  if (submitted.length === 0) return 'pending';

  if (MONTH.test(submitted)) return 'sent';

  // Marca vieja con la hora de llegada (ver `isLegacyArrivalMark`): ese
  // informe no salió con ningún S-1, así que está PENDIENTE.
  //
  // Se pensó leer «verificado = ya contó con su mes» (con la app de entonces,
  // verificar uno así obligaba a deshacer el envío de su mes y regenerarlo),
  // pero eso PIERDE en silencio el que se verifique o se edite desde la app
  // nueva, y hay varios caminos que lo verifican. Contado como pendiente, en el
  // peor caso sale en la lista de atrasados del S-1 con su nombre y su mes, y
  // se aparta con un toque. Un posible doble conteo a la vista es mejor que un
  // informe perdido sin que nadie lo sepa. (A 2026-11-09 no hay ninguno.)
  return 'pending';
};

export const isPendingLate = (report: LateCarrier | undefined) =>
  lateStateOf(report) === 'pending';

export const isRecordOnly = (report: LateCarrier | undefined) =>
  lateStateOf(report) === 'record_only';

/** La marca de «solo para su tarjeta» de un informe de `reportMonth`. */
export const recordOnlyLate = (reportMonth: string): Late => ({
  value: true,
  submitted: reportMonth,
  record_only: true,
});

/**
 * Convierte una marca vieja con la hora de llegada en lo que significa: un
 * atrasado pendiente. No cambia cómo se cuenta (ya se lee como pendiente), pero
 * deja el dato limpio en cuanto la app nueva toca el informe.
 */
export const normalizeLegacyLate = (late: Late): Late =>
  isLegacyArrivalMark(late) ? { value: true, submitted: '' } : late;

/**
 * ¿Se puede seguir editando aunque su mes ya se haya enviado?
 *
 * Sí el atrasado que aún no ha salido, y sí el que es solo para la tarjeta,
 * que no sale nunca. El resto de un mes enviado no se toca.
 */
export const editableAfterMonthSent = (report: LateCarrier | undefined) => {
  const state = lateStateOf(report);

  return state === 'pending' || state === 'record_only';
};

/**
 * Qué marca de atrasado lleva el informe que manda el propio publicador desde
 * su móvil.
 *
 * Si su mes ya se envió y no había ya un informe suyo contado en él, es un
 * atrasado pendiente: se sumará al próximo S-1. Si ya lo había —corrige o
 * reenvía uno que entró a tiempo—, NO: ese mes ya lo contó, y marcarlo
 * atrasado lo contaría dos veces.
 *
 * Un informe BORRADO también puede haber contado: si el publicador lo retiró
 * desde su móvil después de enviado el S-1, el borrado llega igual. Contó si
 * estaba verificado y con participación y se borró después de que saliera el
 * S-1 (`sentAt`); reenviarlo entonces es una corrección, no un atrasado.
 *
 * Antes se guardaba `submitted` con la hora de llegada, que el S-1 lee como
 * «ya enviado»: el informe atrasado de un publicador no llegaba nunca a la
 * sucursal.
 */
export const incomingReportLate = ({
  monthSent,
  sentAt,
  existing,
}: {
  /** ¿El S-1 del mes del informe ya está enviado? */
  monthSent: boolean;
  /** `updatedAt` de ese S-1: cuándo se envió (o se tocó por última vez). */
  sentAt?: string;
  /** El informe de ese mes y persona que ya había: el vivo si lo hay. */
  existing?: CongFieldServiceReportType;
}): Late => {
  const current = normalizeLegacyLate(
    existing?.report_data.late ?? { value: false, submitted: '' }
  );

  if (!monthSent) return current;

  // Ya tenía marca —atrasado pendiente, ya enviado o solo para la tarjeta—: se
  // respeta, la decidió alguien.
  if (current.value) return current;

  if (!existing) return { value: true, submitted: '' };

  const data = existing.report_data;

  const countable = data.status === 'confirmed' && data.shared_ministry;

  if (!countable) return { value: true, submitted: '' };

  if (!data._deleted) return current;

  const deletedAfterSent =
    Boolean(sentAt) && String(data.updatedAt ?? '') > String(sentAt);

  return deletedAfterSent ? current : { value: true, submitted: '' };
};

export type S1Category = 'publishers' | 'APs' | 'FRs';

/** Qué era la persona en un mes. Lo decide la app con sus nombramientos. */
export type S1PersonCategory = 'FMF' | 'FS' | 'AP' | 'FR' | 'publisher';

export type S1Entry = {
  report: CongFieldServiceReportType;
  person: PersonType;
  category: S1Category;
  /** De un mes anterior: se suma aquí porque no salió con el suyo. */
  late: boolean;
};

/**
 * Qué era cada persona en un mes, a partir de la pregunta de la app
 * («¿tenía ese nombramiento ese mes?»).
 */
export const buildS1CategoryOf =
  (
    isEnrolled: (
      person: PersonType,
      enrollment: 'FMF' | 'FS' | 'AP' | 'FR',
      month: string
    ) => boolean
  ) =>
  (person: PersonType, month: string): S1PersonCategory => {
    if (isEnrolled(person, 'FMF', month)) return 'FMF';
    if (isEnrolled(person, 'FS', month)) return 'FS';
    if (isEnrolled(person, 'AP', month)) return 'AP';
    if (isEnrolled(person, 'FR', month)) return 'FR';

    return 'publisher';
  };

/**
 * Los informes que entran en el S-1 de `month`, cada uno en su grupo.
 *
 * Entran:
 *  - los del propio mes, verificados y con participación;
 *  - los atrasados PENDIENTES de meses anteriores (nunca de uno posterior:
 *    regenerar un S-1 viejo no puede llevarse los atrasados de después).
 *
 * No entran nunca los que son solo para la tarjeta, ni los atrasados que ya
 * salieron con otro S-1.
 *
 * Cada informe va al grupo que tenía la persona EN EL MES DEL INFORME, no en
 * el del S-1. Mírian Hernández era publicadora en agosto y auxiliar en
 * octubre: su informe de agosto, sumado a octubre, contaba como de auxiliar.
 * Lo que se suma es la actividad de agosto, y en agosto era publicadora.
 *
 * Los precursores especiales y misioneros (FMF/FS) informan directamente a la
 * sucursal y no entran en este informe.
 */
export const collectS1Reports = ({
  month,
  reports,
  persons,
  categoryOf,
}: {
  month: string;
  reports: CongFieldServiceReportType[];
  persons: PersonType[];
  categoryOf: (person: PersonType, month: string) => S1PersonCategory;
}) => {
  const byUid = new Map(persons.map((person) => [person.person_uid, person]));

  const publishers: S1Entry[] = [];
  const APs: S1Entry[] = [];
  const FRs: S1Entry[] = [];

  for (const report of reports) {
    const data = report?.report_data;

    if (!data || data._deleted) continue;
    if (data.status !== 'confirmed') continue;
    if (!data.shared_ministry) continue;

    const state = lateStateOf(report);

    const ownMonth =
      data.report_date === month &&
      (state === 'on_time' || state === 'pending');

    const lateHere = state === 'pending' && data.report_date < month;

    if (!ownMonth && !lateHere) continue;

    const person = byUid.get(data.person_uid);

    if (!person) continue;

    const category = categoryOf(person, data.report_date);

    if (category === 'FMF' || category === 'FS') continue;

    const entry: S1Entry = {
      report,
      person,
      category:
        category === 'AP' ? 'APs' : category === 'FR' ? 'FRs' : 'publishers',
      late: lateHere,
    };

    if (entry.category === 'APs') APs.push(entry);
    else if (entry.category === 'FRs') FRs.push(entry);
    else publishers.push(entry);
  }

  const late = [...publishers, ...APs, ...FRs]
    .filter((entry) => entry.late)
    .sort(
      (a, b) =>
        a.report.report_data.report_date.localeCompare(
          b.report.report_data.report_date
        ) || a.person.person_uid.localeCompare(b.person.person_uid)
    );

  return { publishers, APs, FRs, late };
};

export type S1Result = ReturnType<typeof collectS1Reports>;

/** Lo que el S-1 manda de cada grupo: informes, horas y cursos. */
export const s1Totals = (result: S1Result) => {
  const studies = (entries: S1Entry[]) =>
    entries.reduce(
      (acc, entry) => acc + (entry.report.report_data.bible_studies ?? 0),
      0
    );

  const hours = (entries: S1Entry[]) =>
    entries.reduce(
      (acc, entry) =>
        acc + (entry.report.report_data.hours?.field_service ?? 0),
      0
    );

  return {
    publishers: {
      report_count: result.publishers.length,
      bible_studies: studies(result.publishers),
    },
    APs: {
      report_count: result.APs.length,
      hours: hours(result.APs),
      bible_studies: studies(result.APs),
    },
    FRs: {
      report_count: result.FRs.length,
      hours: hours(result.FRs),
      bible_studies: studies(result.FRs),
    },
  };
};

export type S1Data = ReturnType<typeof s1Totals> & {
  publishers_active: number;
  weekend_meeting_average: number;
};

/**
 * ¿El S-1 guardado ya no dice lo que dirían los datos de ahora?
 *
 * El S-1 es una FOTO: se calcula al pulsar «Generar» y se guarda. Si después
 * se verifica un informe, se aparta uno para la tarjeta o se corrige la
 * asistencia, la foto se queda vieja, y lo que se manda es la foto. Con esto la
 * pantalla avisa y no deja marcarlo como enviado hasta regenerarlo.
 */
export const s1Differs = (
  stored:
    | {
        publishers_active?: number;
        weekend_meeting_average?: number;
        publishers?: { report_count?: number; bible_studies?: number };
        APs?: { report_count?: number; hours?: number; bible_studies?: number };
        FRs?: { report_count?: number; hours?: number; bible_studies?: number };
      }
    | undefined,
  live: S1Data
) => {
  if (!stored) return false;

  const pares: [number | undefined, number][] = [
    [stored.publishers_active, live.publishers_active],
    [stored.weekend_meeting_average, live.weekend_meeting_average],
    [stored.publishers?.report_count, live.publishers.report_count],
    [stored.publishers?.bible_studies, live.publishers.bible_studies],
    [stored.APs?.report_count, live.APs.report_count],
    [stored.APs?.hours, live.APs.hours],
    [stored.APs?.bible_studies, live.APs.bible_studies],
    [stored.FRs?.report_count, live.FRs.report_count],
    [stored.FRs?.hours, live.FRs.hours],
    [stored.FRs?.bible_studies, live.FRs.bible_studies],
  ];

  return pares.some(([a, b]) => (a ?? 0) !== (b ?? 0));
};

/**
 * Los atrasados pendientes que este S-1 sumó: son EXACTAMENTE los que hay que
 * marcar como enviados con él. Antes se marcaban todos los pendientes hasta
 * ese mes, también los que el S-1 no había sumado (sin participación, sin
 * verificar…), y esos se perdían.
 */
export const s1PendingCounted = (result: S1Result) =>
  [...result.publishers, ...result.APs, ...result.FRs]
    .filter((entry) => lateStateOf(entry.report) === 'pending')
    .map((entry) => entry.report);

/**
 * Atrasados de meses anteriores que este S-1 NO puede sumar todavía porque
 * nadie los ha verificado: los que manda el propio publicador desde su móvil.
 * Se enseñan en la pantalla del S-1 para que no se queden olvidados.
 */
export const unverifiedLateReports = (
  month: string,
  reports: CongFieldServiceReportType[]
) =>
  reports.filter(
    (report) =>
      !report.report_data._deleted &&
      report.report_data.status === 'received' &&
      report.report_data.shared_ministry &&
      report.report_data.report_date < month &&
      lateStateOf(report) === 'pending'
  );

/** Los atrasados de meses anteriores que salieron con el S-1 de `month`. */
export const lateReportsSentWith = (
  month: string,
  reports: CongFieldServiceReportType[]
) =>
  reports.filter(
    (report) =>
      !report.report_data._deleted &&
      report.report_data.report_date < month &&
      lateStateOf(report) === 'sent' &&
      report.report_data.late.submitted === month
  );
