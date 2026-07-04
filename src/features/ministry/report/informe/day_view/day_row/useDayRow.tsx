import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCurrentUser } from '@hooks/index';
import {
  reportUserDraftState,
  userFieldServiceDailyReportsState,
} from '@states/user_field_service_reports';
import { userFieldServiceDailyReportSchema } from '@services/dexie/schema';
import { personIsEnrollmentActive } from '@services/app/persons';
import { MonthDayCell } from '../../month_view/useMonthView';

const useDayRow = (cell: MonthDayCell, locked: boolean) => {
  const { person } = useCurrentUser();
  const dailyReports = useAtomValue(userFieldServiceDailyReportsState);
  const setDraftReport = useSetAtom(reportUserDraftState);

  const [expanded, setExpanded] = useState(false);

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

  const handleToggleExpand = () => {
    if (locked) return;

    if (!expanded) {
      const report = existingReport
        ? structuredClone(existingReport)
        : (() => {
            const fresh = structuredClone(userFieldServiceDailyReportSchema);
            fresh.report_date = cell.dateStr;
            return fresh;
          })();

      setDraftReport(report);
    }

    setExpanded((prev) => !prev);
  };

  const handleClose = () => setExpanded(false);

  const summaryHours = existingReport?.report_data.hours.field_service || '0:00';
  const summaryStudies = existingReport?.report_data.bible_studies.value || 0;

  return {
    expanded,
    handleToggleExpand,
    handleClose,
    hoursEnabled,
    summaryHours,
    summaryStudies,
    hasExistingReport: Boolean(existingReport),
  };
};

export default useDayRow;
