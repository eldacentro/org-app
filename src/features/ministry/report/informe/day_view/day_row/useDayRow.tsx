import { useAtomValue } from 'jotai';
import { useCurrentUser } from '@hooks/index';
import { userFieldServiceDailyReportsState } from '@states/user_field_service_reports';
import { personIsEnrollmentActive } from '@services/app/persons';
import { MonthDayCell } from '../../month_view/useMonthView';

/**
 * Fila de solo resumen — la edición ya no vive aquí (se movió a la tarjeta
 * grande de arriba, `today_card`), así que esta fila solo necesita mostrar
 * el resumen y avisar al padre qué día se tocó.
 */
const useDayRow = (cell: MonthDayCell) => {
  const { person } = useCurrentUser();
  const dailyReports = useAtomValue(userFieldServiceDailyReportsState);

  const existingReport = dailyReports.find((r) => r.report_date === cell.dateStr);

  const hoursEnabled = (() => {
    if (!person || !cell.dateStr) return false;
    const month = cell.dateStr.slice(0, 7);
    return (
      personIsEnrollmentActive(person, 'AP', month) ||
      personIsEnrollmentActive(person, 'FR', month) ||
      personIsEnrollmentActive(person, 'FMF', month) ||
      personIsEnrollmentActive(person, 'FS', month)
    );
  })();

  const summaryHours = existingReport?.report_data.hours.field_service || '0:00';
  const summaryStudies = existingReport?.report_data.bible_studies.value || 0;

  return {
    hoursEnabled,
    summaryHours,
    summaryStudies,
  };
};

export default useDayRow;
