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
