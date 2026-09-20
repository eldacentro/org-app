import type { PersonType } from '@definition/person';
import { groupConsecutiveMonths } from '@utils/date';
import { formatDate } from '@utils/date';

export type APEnrollmentPeriod = {
  start_date: string;
  end_date: string;
};

/**
 * De los meses que pide una solicitud de precursor auxiliar, a los periodos de
 * inscripción que hay que dejar en la ficha de la persona.
 *
 * Vive aquí y no dentro del hook de aprobación porque es LA cuenta de la que
 * depende que el hermano conste como precursor auxiliar: si el mes de fin se
 * calcula mal por un día, la inscripción no cubre el mes que pidió y no sale
 * en ningún listado ni en ningún informe. Meses consecutivos se agrupan en un
 * solo periodo ("2026/09" y "2026/10" son una inscripción de septiembre a
 * octubre, no dos).
 */
export const buildAPEnrollmentPeriods = (
  months: string[]
): APEnrollmentPeriod[] => {
  if (!months || months.length === 0) return [];

  const clean = Array.from(new Set(months.filter(Boolean))).sort();

  if (clean.length === 0) return [];

  return groupConsecutiveMonths(clean).map((group) => {
    const splits = group.split('-');

    const start_date = `${splits[0]}/01`;

    let [year, month] = splits[0].split('/').map(Number);

    if (splits[1]) {
      const last = splits[1].split('/').map(Number);
      year = last[0];
      month = last[1];
    }

    // Día 0 del mes SIGUIENTE es el último día de este mes — y así el mes de
    // 31, el de 30 y febrero (bisiesto incluido) salen solos.
    const end_date = formatDate(new Date(year, month, 0), 'yyyy/MM/dd');

    return { start_date, end_date };
  });
};

/**
 * ¿Tiene esta persona una inscripción de precursor auxiliar VIVA para ese
 * periodo exacto?
 */
const tienePeriodo = (person: PersonType, period: APEnrollmentPeriod) =>
  (person.person_data.enrollments ?? []).some(
    (record) =>
      record._deleted === false &&
      record.enrollment === 'AP' &&
      record.start_date === period.start_date &&
      record.end_date === period.end_date
  );

/**
 * Deja en la ficha las inscripciones de precursor auxiliar de esos periodos.
 *
 * Idempotente: lo que ya está no se duplica. Es la cuenta que hace la
 * aprobación de una solicitud, y también la que hace falta al MOVER una
 * solicitud de persona —si no, la inscripción se queda en quien no era—.
 *
 * Devuelve la MISMA persona si no había nada que añadir, para que quien llama
 * sepa con un `===` que no hace falta guardar.
 */
export const addAPEnrollments = (
  person: PersonType,
  periods: APEnrollmentPeriod[]
): PersonType => {
  const faltan = (periods ?? []).filter(
    (period) => !tienePeriodo(person, period)
  );

  if (faltan.length === 0) return person;

  const nueva = structuredClone(person);

  for (const period of faltan) {
    nueva.person_data.enrollments.push({
      id: crypto.randomUUID(),
      enrollment: 'AP',
      _deleted: false,
      start_date: period.start_date,
      end_date: period.end_date,
      updatedAt: new Date().toISOString(),
    });
  }

  return nueva;
};

/**
 * Retira de la ficha las inscripciones de precursor auxiliar de esos periodos.
 *
 * Con LÁPIDA (`_deleted` y fecha nueva), nunca sacándolas de la lista: así el
 * borrado llega a los demás dispositivos. Solo toca los periodos EXACTOS que se
 * le pasan —los que creó la solicitud que se está moviendo—, así que una
 * inscripción puesta a mano con otras fechas no se toca.
 *
 * Devuelve la MISMA persona si no había nada que quitar.
 */
export const removeAPEnrollments = (
  person: PersonType,
  periods: APEnrollmentPeriod[]
): PersonType => {
  const sobran = (periods ?? []).filter((period) =>
    tienePeriodo(person, period)
  );

  if (sobran.length === 0) return person;

  const nueva = structuredClone(person);

  for (const record of nueva.person_data.enrollments) {
    if (record._deleted) continue;
    if (record.enrollment !== 'AP') continue;

    const coincide = sobran.some(
      (period) =>
        record.start_date === period.start_date &&
        record.end_date === period.end_date
    );

    if (!coincide) continue;

    record._deleted = true;
    record.updatedAt = new Date().toISOString();
  }

  return nueva;
};
