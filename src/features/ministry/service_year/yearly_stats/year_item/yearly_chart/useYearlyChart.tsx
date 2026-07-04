import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useCurrentUser } from '@hooks/index';
import { monthShortNamesState } from '@states/app';
import { congSpecialMonthsState } from '@states/settings';
import { currentMonthServiceYear } from '@utils/date';
import useMonthlyStats from '../../../monthly_stats/useMontlyStats';
import useMinistryYearlyRecord from '@features/ministry/hooks/useMinistryYearlyRecord';
import { computeMonthlyGoal } from '@features/ministry/hooks/useMonthlyGoal';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { UserFieldServiceMonthlyReportType } from '@definition/user_field_service_reports';

export type YearlyChartMonth = {
  month: string;
  label: string;
  hours: number;
  goal: number | undefined;
  isCurrent: boolean;
  isAhead: boolean;
  hasReport: boolean;
};

const dailyMonthlyToHours = (daily: string, monthly: string) => {
  const [dH, dM] = (daily || '0:00').split(':').map(Number);
  const [mH, mM] = (monthly || '0:00').split(':').map(Number);
  const totalMinutes = dH * 60 + (dM || 0) + (mH * 60 + (mM || 0));

  return Math.round(totalMinutes / 60);
};

const creditToHours = (credit: { daily: string; monthly: string }) => {
  return dailyMonthlyToHours(credit.daily, credit.monthly);
};

const getMonthData = (
  month: string,
  yearlyCongReports: CongFieldServiceReportType[],
  yearlyUserReports: UserFieldServiceMonthlyReportType[]
) => {
  const congReport = yearlyCongReports.find(
    (record) => record.report_data.report_date === month
  );

  if (congReport) {
    const { hours } = congReport.report_data;
    const credit =
      hours.credit.approved > 0 ? hours.credit.approved : hours.credit.value;

    return { hours: hours.field_service + credit, hasReport: true };
  }

  const userReport = yearlyUserReports.find(
    (record) => record.report_date === month
  );

  if (userReport) {
    const { hours } = userReport.report_data;

    return {
      hours:
        dailyMonthlyToHours(hours.field_service.daily, hours.field_service.monthly) +
        creditToHours(hours.credit),
      hasReport: true,
    };
  }

  return { hours: 0, hasReport: false };
};

/**
 * Arma los 12 (o menos) puntos del año para `YearlyChart`, reutilizando los
 * datos ya traídos por `useMonthlyStats`/`useMinistryYearlyRecord` — no
 * vuelve a consultar Dexie. La meta de cada mes usa `computeMonthlyGoal`
 * (la misma regla de `useMonthlyGoal`, extraída como función pura) para que
 * nunca se desincronice de lo que ya muestra el resto de la app.
 */
const useYearlyChart = (year: string) => {
  const { person } = useCurrentUser();
  const { monthsList } = useMonthlyStats();
  const { yearlyReports, yearlyCongReports } = useMinistryYearlyRecord(year);
  const monthShortNames = useAtomValue(monthShortNamesState);
  const specialMonths = useAtomValue(congSpecialMonthsState);

  const months = useMemo<YearlyChartMonth[]>(() => {
    const currentMonth = currentMonthServiceYear();

    return monthsList.map(({ value: month }) => {
      const { hours, hasReport } = getMonthData(month, yearlyCongReports, yearlyReports);

      const monthIndex = +month.split('/')[1] - 1;

      return {
        month,
        label: monthShortNames[monthIndex],
        hours,
        goal: computeMonthlyGoal(person, month, specialMonths),
        isCurrent: month === currentMonth,
        isAhead: month > currentMonth,
        hasReport,
      };
    });
  }, [monthsList, yearlyCongReports, yearlyReports, monthShortNames, person, specialMonths]);

  return { months };
};

export default useYearlyChart;
