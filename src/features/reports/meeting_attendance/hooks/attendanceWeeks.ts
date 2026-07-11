import { MeetingType } from '@definition/app';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { formatDate } from '@utils/date';

export type AttendanceWeek = {
  // lunes de la semana del programa a la que pertenece la reunión ('yyyy/MM/dd')
  weekOf: string;
  // fecha real de la reunión ('yyyy/MM/dd')
  date: string;
};

/**
 * Semanas de asistencia de un mes por MES NATURAL: las reuniones cuentan en el
 * mes de su FECHA, no en el mes del lunes de su semana. Es el criterio que pide
 * la sucursal para el S-88 (y el que usaba TsWin, del que se migró el
 * histórico): la reunión del miércoles 1 de julio pertenece a julio aunque su
 * semana empiece el lunes 29 de junio.
 *
 * Devuelve, para el mes y tipo de reunión dados, la lista ordenada de
 * reuniones cuya fecha cae dentro del mes (4 o 5). La posición i (base 0)
 * corresponde a week_{i+1} del registro de asistencia de ese mes.
 *
 * Como la reunión de entre semana y la de fin de semana de una misma semana
 * pueden caer en meses distintos, la lista se calcula POR TIPO — igual que el
 * registro guarda cada tipo por separado.
 */
export const attendanceWeeksForMonth = (
  month: string,
  type: MeetingType,
  dataView?: string
): AttendanceWeek[] => {
  const [year, monthValue] = (month ?? '').split('/').map(Number);

  // month malformado ('' en el primer render, etc.) daría Invalid Date y los
  // bucles de abajo no terminarían nunca (getDay() de Invalid Date es NaN)
  if (!Number.isInteger(year) || !Number.isInteger(monthValue)) return [];

  // candidatos: lunes desde 6 días antes del día 1 (una reunión del mes puede
  // venir de una semana cuyo lunes quedó en el mes anterior) hasta fin de mes
  const first = new Date(year, monthValue - 1, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - 6);

  const monday = new Date(start);
  for (let i = 0; i < 7 && monday.getDay() !== 1; i++) {
    monday.setDate(monday.getDate() + 1);
  }

  const result: AttendanceWeek[] = [];
  const lastDay = new Date(year, monthValue, 0);

  while (monday <= lastDay && result.length < 5) {
    const weekOf = formatDate(new Date(monday), 'yyyy/MM/dd');

    const { date } = schedulesGetMeetingDate({
      week: weekOf,
      meeting: type,
      dataView,
    });

    if (date && date.startsWith(month)) {
      result.push({ weekOf, date });
    }

    monday.setDate(monday.getDate() + 7);
  }

  return result;
};
