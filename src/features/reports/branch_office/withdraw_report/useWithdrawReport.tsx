import { useAtomValue } from 'jotai';
import { WithdrawReportProps } from './index.types';
import {
  branchSelectedMonthState,
  branchSelectedReportState,
  branchSelectedYearState,
} from '@states/branch_reports';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { dbBranchFieldReportSave } from '@services/dexie/branch_field_service_reports';
import { branchCongAnalysisState } from '@states/branch_cong_analysis';
import { dbBranchCongAnalysisSave } from '@services/dexie/branch_cong_analysis';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { dbFieldServiceReportsBulkSave } from '@services/dexie/cong_field_service_reports';
import { lateStateOf } from '@services/app/late_reports';

const useWithdrawReport = ({ onClose }: WithdrawReportProps) => {
  const report = useAtomValue(branchSelectedReportState);
  const month = useAtomValue(branchSelectedMonthState);
  const year = useAtomValue(branchSelectedYearState);
  const reports = useAtomValue(branchFieldReportsState);
  const congAnalysis = useAtomValue(branchCongAnalysisState);
  const congReports = useAtomValue(congFieldServiceReportsState);

  const handleS1 = async () => {
    // Los atrasados que salieron con este S-1 vuelven a estar pendientes. Con
    // `updatedAt` nuevo, o el servidor descarta el cambio (ver el envío).
    const now = new Date().toISOString();

    // Todos los que salieron con él, estén como estén ahora: uno que el
    // publicador corrigió después vuelve a «sin verificar», pero también salió
    // con este S-1, y si se quedara marcado como enviado no entraría en el
    // S-1 rehecho ni en ningún otro.
    const lateReports = congReports.filter(
      (record) =>
        lateStateOf(record) === 'sent' &&
        record.report_data.late.submitted === month
    );

    const reportsToSave = lateReports.map((report) => {
      const obj = structuredClone(report);
      obj.report_data.late = { value: true, submitted: '' };
      obj.report_data.updatedAt = now;

      return obj;
    });

    await dbFieldServiceReportsBulkSave(reportsToSave);

    // save status
    const currentReport = reports.find(
      (record) => record.report_date === month
    );

    const report = structuredClone(currentReport);
    report.report_data.submitted = false;
    report.report_data.updatedAt = new Date().toISOString();

    await dbBranchFieldReportSave(report);
  };

  const handleS10 = async () => {
    const currentAnalysis = congAnalysis.find(
      (record) => record.report_date === year
    );

    const analyis = structuredClone(currentAnalysis);
    analyis.report_data.submitted = false;
    analyis.report_data.updatedAt = new Date().toISOString();

    await dbBranchCongAnalysisSave(analyis);
  };

  const handleWithdraw = async () => {
    try {
      if (report === 'S-1') {
        await handleS1();
      }

      if (report === 'S-10') {
        await handleS10();
      }

      onClose?.();
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return { handleWithdraw };
};

export default useWithdrawReport;
