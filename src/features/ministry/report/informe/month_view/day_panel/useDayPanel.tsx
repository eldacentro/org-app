import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  reportUserDraftState,
  userFieldServiceDailyReportsState,
} from '@states/user_field_service_reports';
import { userFieldServiceDailyReportSchema } from '@services/dexie/schema';

/**
 * Prepara el borrador compartido (`reportUserDraftState`) cada vez que se
 * selecciona un día distinto en el calendario — mismo mecanismo que ya
 * usaba la fila de Día, solo que aquí el panel vive dentro de Mes.
 */
const useDayPanel = (dateStr: string | null) => {
  const dailyReports = useAtomValue(userFieldServiceDailyReportsState);
  const setDraftReport = useSetAtom(reportUserDraftState);

  const existingReport = dateStr
    ? dailyReports.find((r) => r.report_date === dateStr)
    : undefined;

  useEffect(() => {
    if (!dateStr) return;

    const report = existingReport
      ? structuredClone(existingReport)
      : (() => {
          const fresh = structuredClone(userFieldServiceDailyReportSchema);
          fresh.report_date = dateStr;
          return fresh;
        })();

    setDraftReport(report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  return { hasExistingReport: Boolean(existingReport) };
};

export default useDayPanel;
