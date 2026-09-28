import type { PersonType } from '@definition/person';
import type { APHours } from '@definition/ministry';
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
 * Pone las horas en las inscripciones de precursor auxiliar QUE YA EXISTEN para
 * esos periodos. No crea ninguna.
 *
 * Separado de `addAPEnrollments` porque el repaso de las solicitudes ya
 * aprobadas —el que rellena las horas de lo aprobado antes de que existiera el
 * campo— tiene que poder corregir sin añadir: una inscripción que el comité
 * quitó a mano no puede volver sola por abrir una pantalla.
 *
 * Devuelve la MISMA persona si no había nada que cambiar.
 */
export const setAPEnrollmentHours = (
  person: PersonType,
  periods: APEnrollmentPeriod[],
  hours?: APHours
): PersonType => {
  // NUNCA se borra el campo para decir «30»: la fusión de la sincronización
  // hace `Object.assign` del registro remoto sobre el local, o sea que copia lo
  // que hay pero no quita lo que falta. Un 15 borrado aquí seguiría vivo en los
  // demás dispositivos para siempre — es el fallo que ya costó caro con los
  // campos que se limpian (ver `worker/merge.ts`). Se escribe el 30.
  const horas: APHours = hours === 15 ? 15 : 30;

  // Al LEER, en cambio, no hace falta el campo: una inscripción puesta a mano,
  // o de antes de que el campo existiera, es de 30. Por eso se compara con el
  // valor normalizado y no con el campo en crudo — si no, esto reescribiría un
  // 30 explícito encima de todas las inscripciones viejas sin motivo.
  const desfasada = (
    record: PersonType['person_data']['enrollments'][number]
  ) =>
    record._deleted === false &&
    record.enrollment === 'AP' &&
    (record.hours ?? 30) !== horas &&
    (periods ?? []).some(
      (period) =>
        record.start_date === period.start_date &&
        record.end_date === period.end_date
    );

  if (!(person.person_data.enrollments ?? []).some(desfasada)) return person;

  const nueva = structuredClone(person);

  for (const record of nueva.person_data.enrollments) {
    if (!desfasada(record)) continue;

    record.hours = horas;
    record.updatedAt = new Date().toISOString();
  }

  return nueva;
};

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
  periods: APEnrollmentPeriod[],
  hours?: APHours
): PersonType => {
  const horas: APHours = hours === 15 ? 15 : 30;

  // Cambiar las horas de una solicitud YA aprobada tiene que llegar hasta la
  // inscripción: el secretario puede corregir 15↔30 después, y si esto no se
  // actualizara, el informe seguiría con la meta vieja para siempre.
  const base = setAPEnrollmentHours(person, periods, hours);

  const faltan = (periods ?? []).filter(
    (period) => !tienePeriodo(base, period)
  );

  if (faltan.length === 0) return base;

  const nueva = base === person ? structuredClone(person) : base;

  for (const period of faltan) {
    nueva.person_data.enrollments.push({
      id: crypto.randomUUID(),
      enrollment: 'AP',
      _deleted: false,
      start_date: period.start_date,
      end_date: period.end_date,
      updatedAt: new Date().toISOString(),
      hours: horas,
    });
  }

  return nueva;
};

/**
 * Las horas del mes que le tocan a esta persona como precursora auxiliar en ese
 * mes: 15 solo si hay una inscripción 'AP' que lo diga, 30 en todo lo demás.
 *
 * Una inscripción SIN fecha de fin es la del precursorado auxiliar continuo, y
 * esa es siempre de 30: nadie puede saber hoy qué meses de los que vengan
 * permitirán las 15, que es también por lo que la solicitud no deja elegirlas
 * cuando se marca «de continuo» (ver `puedeElegir15Horas`).
 *
 * Devuelve `undefined` si la persona no es precursora auxiliar ese mes.
 */
export const apEnrollmentHours = (
  person: PersonType,
  month: string
): APHours | undefined => {
  const vigentes = (person?.person_data?.enrollments ?? []).filter((record) => {
    if (record._deleted) return false;
    if (record.enrollment !== 'AP') return false;
    if (!record.start_date) return false;

    const desde = formatDate(new Date(record.start_date), 'yyyy/MM');

    // Sin fecha de fin, la inscripción sigue viva: cubre cualquier mes desde su
    // comienzo.
    const hasta = record.end_date
      ? formatDate(new Date(record.end_date), 'yyyy/MM')
      : undefined;

    return desde <= month && (hasta === undefined || month <= hasta);
  });

  if (vigentes.length === 0) return undefined;

  // Con varias vigentes a la vez, mandan las 30: la meta más exigente es la que
  // no deja a nadie corto. Solo pasa si se solapan a mano.
  return vigentes.every((record) => record.hours === 15) ? 15 : 30;
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
