import { useMemo } from 'react';
import { capitalizarPrimera } from '@utils/common';
import { useAtom, useAtomValue } from 'jotai';
import { useCurrentUser } from '@hooks/index';
import { dayNamesShortState, monthNamesState } from '@states/app';
import { firstDayWeekState } from '@states/settings';
import {
  reportUserSelectedMonthState,
  userFieldServiceDailyReportsState,
} from '@states/user_field_service_reports';
import { formatDate } from '@utils/date';
import useMinistryMonthlyRecord from '@features/ministry/hooks/useMinistryMonthlyRecord';
import useMonthlyGoal from '@features/ministry/hooks/useMonthlyGoal';

export type MonthDayCell = {
  date: Date | null;
  dateStr: string;
  dayNum: number;
  hasRecord: boolean;
  isToday: boolean;
};

const useMonthView = () => {
  const { person } = useCurrentUser();
  const dayNamesShort = useAtomValue(dayNamesShortState);

  // Por qué día empieza la semana en el calendario. Es el ajuste de la
  // congregación (Ajustes → Formularios de reunión), el mismo que siguen los
  // selectores de fecha de toda la app, y por defecto es el LUNES. Antes esto
  // empezaba siempre en domingo, a la americana, porque tomaba el `getDay()`
  // de JavaScript tal cual. Sus valores son los de `getDay()` (0 = domingo,
  // 1 = lunes, 6 = sábado), así que se pueden restar sin traducir nada.
  const primerDia = useAtomValue(firstDayWeekState);

  // La cabecera, girada para que empiece por ese día. `dayNamesShort` viene
  // siempre desde el domingo.
  const weekdayHeaders = useMemo(
    () =>
      dayNamesShort.map(
        (_, idx) => dayNamesShort[(idx + primerDia) % dayNamesShort.length]
      ),
    [dayNamesShort, primerDia]
  );
  const monthNames = useAtomValue(monthNamesState);
  const [selectedMonth, setSelectedMonth] = useAtom(
    reportUserSelectedMonthState
  );
  const dailyReports = useAtomValue(userFieldServiceDailyReportsState);

  const { hours_total, read_only, status } = useMinistryMonthlyRecord({
    month: selectedMonth,
    person_uid: person?.person_uid ?? '',
    publisher: true,
  });

  const locked = read_only || status === 'submitted';

  const goal = useMonthlyGoal(person, selectedMonth);

  const hoursValue = useMemo(() => {
    const [h] = (hours_total || '0:00').split(':').map(Number);
    return h || 0;
  }, [hours_total]);

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('/').map(Number);
    return `${capitalizarPrimera(monthNames[month - 1])} ${year}`;
  }, [selectedMonth, monthNames]);

  const todayStr = formatDate(new Date(), 'yyyy/MM/dd');

  const cells = useMemo<MonthDayCell[]>(() => {
    if (!selectedMonth) return [];

    const [year, month] = selectedMonth.split('/').map(Number);
    const firstOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    // Cuántas casillas vacías antes del día 1: los días que hay desde el primer
    // día de la semana hasta el día en que cae el 1. El `+ 7` evita un
    // negativo cuando el mes empieza antes que la semana (un domingo, con la
    // semana en lunes, son 6 huecos y no -1).
    const leadingBlanks = (firstOfMonth.getDay() - primerDia + 7) % 7;

    const result: MonthDayCell[] = [];

    for (let i = 0; i < leadingBlanks; i++) {
      result.push({
        date: null,
        dateStr: '',
        dayNum: 0,
        hasRecord: false,
        isToday: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = formatDate(date, 'yyyy/MM/dd');

      const record = dailyReports.find((r) => r.report_date === dateStr);
      const hasRecord = Boolean(
        record &&
        (record.report_data.hours.field_service !== '0:00' ||
          record.report_data.bible_studies.value > 0)
      );

      result.push({
        date,
        dateStr,
        dayNum: day,
        hasRecord,
        isToday: dateStr === todayStr,
      });
    }

    return result;
  }, [selectedMonth, dailyReports, todayStr, primerDia]);

  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('/').map(Number);
    const prev = new Date(year, month - 2, 1);
    setSelectedMonth(formatDate(prev, 'yyyy/MM'));
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('/').map(Number);
    const next = new Date(year, month, 1);
    setSelectedMonth(formatDate(next, 'yyyy/MM'));
  };

  return {
    weekdayHeaders,
    cells,
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    hoursValue,
    goal,
    hours_total,
    locked,
    selectedMonth,
    person_uid: person?.person_uid ?? '',
  };
};

export default useMonthView;
