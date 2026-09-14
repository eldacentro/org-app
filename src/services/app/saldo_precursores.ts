import type { PersonType } from '@definition/person';
import type { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { monthlyCreditedTotal, rawCreditHours } from './credit_hours';

/**
 * Saldo de horas de los precursores regulares en UN año de servicio.
 *
 * Es lo que mira el comité de servicio en Registros de publicadores: por cada
 * mes con informe en que la persona era precursora regular, sus horas
 * (predicación más el crédito que quepa) menos la meta de 50.
 *
 * El año lo decide QUIEN MIRA, nunca la fecha de hoy. Antes esto se calculaba
 * dentro de la tarjeta con el año de servicio en curso, así que elegir otro
 * año en las pestañas de arriba no le llegaba. Mientras el año en curso tuvo
 * informes no se notó; el 1 de septiembre de 2026 el año pasó a ser 2027, que
 * aún no tenía ninguno, y el secretario ya no podía analizar 2026 por mucho
 * que lo eligiera.
 */

/** La meta mensual de un precursor regular. */
export const META_MENSUAL_PRECURSOR = 50;

export type SaldoPrecursor = {
  person_uid: string;
  name: string;
  /** Horas de predicación del año, enteras: no tienen techo. */
  horas: number;
  /**
   * El crédito que CONTÓ: cada mes, lo que quepa hasta 55 con la predicación.
   * No es lo apuntado en bruto, a propósito: así `horas + credito = total`
   * cuadra en la tabla, y el saldo sale de ese total. Ver `credit_hours.ts`.
   */
  credito: number;
  /** Predicación más el crédito que contó. */
  total: number;
  /** El total menos la meta (50 por cada mes con informe de precursor). */
  balance: number;
};

/**
 * Los doce meses 'YYYY/MM' de un año de servicio, con la etiqueta de la app
 * (la del año en que TERMINA): «2026» va de septiembre de 2025 a agosto de
 * 2026.
 *
 * Escrito aquí y no con `createArrayFromMonths` a propósito: `utils/date`
 * arrastra el store y las traducciones, y esto tiene que poder probarse solo.
 */
export const mesesDelAñoDeServicio = (year: string): string[] => {
  const fin = Number(year);

  if (!Number.isInteger(fin) || fin <= 0) return [];

  const meses: string[] = [];

  for (let i = 0; i < 12; i++) {
    // 9, 10, 11, 12, 1, 2 … 8
    const mes = ((8 + i) % 12) + 1;
    const año = mes >= 9 ? fin - 1 : fin;

    meses.push(`${año}/${String(mes).padStart(2, '0')}`);
  }

  return meses;
};

export const saldoDePrecursores = ({
  persons,
  reports,
  year,
  estabaDePrecursor,
  nombre,
}: {
  persons: PersonType[];
  reports: CongFieldServiceReportType[];
  year: string;
  /** ¿Era precursora regular esa persona ese mes ('YYYY/MM')? */
  estabaDePrecursor: (person: PersonType, month: string) => boolean;
  nombre: (person: PersonType) => string;
}): SaldoPrecursor[] => {
  const meses = mesesDelAñoDeServicio(year);

  if (meses.length === 0) return [];

  // Los informes de cada persona, de una pasada: si no, se recorrería la
  // lista entera de la congregación una vez por hermano.
  const informesDe = new Map<string, CongFieldServiceReportType[]>();

  for (const report of reports ?? []) {
    const data = report?.report_data;

    if (!data || data._deleted) continue;

    const lista = informesDe.get(data.person_uid);

    if (lista) lista.push(report);
    else informesDe.set(data.person_uid, [report]);
  }

  const result: SaldoPrecursor[] = [];

  for (const person of persons ?? []) {
    // QUIÉN sale: quien fue precursor regular AL MENOS UN MES de ese año.
    //
    // Se pregunta mes a mes, que es como luego se cuentan las horas. La
    // comprobación «por año» que usa el resto de la app deja fuera a quien ya
    // era precursor antes de septiembre y lo dejó durante el año — justo la
    // gente que el comité quiere repasar cuando mira un año que ya terminó.
    const mesesDePrecursor = new Set(
      meses.filter((mes) => estabaDePrecursor(person, mes))
    );

    if (mesesDePrecursor.size === 0) continue;

    let horas = 0;
    let credito = 0;
    let balance = 0;

    for (const report of informesDe.get(person.person_uid) ?? []) {
      const data = report.report_data;

      // Fuera del año, o un mes en que no era precursor: no cuenta.
      if (!mesesDePrecursor.has(data.report_date)) continue;

      // CON EL TOPE DEL MES: la predicación cuenta entera y el crédito solo lo
      // que quepa hasta 55. Ver `credit_hours.ts`.
      const campo = Number.isFinite(data.hours.field_service)
        ? Math.max(0, data.hours.field_service)
        : 0;

      const totalMes = monthlyCreditedTotal(
        campo,
        rawCreditHours(data.hours.credit)
      );

      // Separadas, y no solo el total: el secretario las quiere ver aparte
      // porque es como se encuentra un informe mal metido (unas horas de
      // crédito apuntadas como predicación, o un cero de más).
      horas += campo;
      credito += totalMes - campo;
      balance += totalMes - META_MENSUAL_PRECURSOR;
    }

    result.push({
      person_uid: person.person_uid,
      name: nombre(person),
      horas,
      credito,
      total: horas + credito,
      balance,
    });
  }

  // Los que van por debajo primero: es lo que el comité necesita ver de un
  // vistazo.
  return result.sort((a, b) => a.balance - b.balance);
};
