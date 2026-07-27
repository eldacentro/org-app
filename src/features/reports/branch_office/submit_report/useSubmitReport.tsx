import { useAtomValue } from 'jotai';
import { SubmitReportProps } from './index.types';
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
import { dateFirstDayMonth, lastDayOfReportMonth } from '@utils/date';
import { buildPublisherHistoryUpdates } from '@services/app/publisher_status';
import { dbPersonsBulkSave } from '@services/dexie/persons';
import usePersons from '@features/persons/hooks/usePersons';

const useSubmitReport = ({ onClose }: SubmitReportProps) => {
  const report = useAtomValue(branchSelectedReportState);
  const month = useAtomValue(branchSelectedMonthState);
  const year = useAtomValue(branchSelectedYearState);
  const reports = useAtomValue(branchFieldReportsState);
  const congAnalysis = useAtomValue(branchCongAnalysisState);
  const congReports = useAtomValue(congFieldServiceReportsState);

  const { getPublishersInactive, getPublishersActive } = usePersons();

  /**
   * Al enviar el S-1 se pone al día el historial de publicador, en los DOS
   * sentidos: se cierra el tramo de quien ya consta como inactivo, y se vuelve
   * a abrir el de quien consta como activo y lo tenía cerrado.
   *
   * Antes solo cerraba. La consecuencia era que quien volvía a informar se
   * quedaba con el historial diciendo que había dejado de ser publicador, y
   * arreglarlo había que hacerlo a mano ficha por ficha — cuando la app ya
   * sabía, por sus propios informes, que seguía siendo publicador. Le pasó a
   * Andrés y Loli Argente.
   *
   * El historial es solo el REGISTRO de hasta cuándo fue publicador: quién
   * está activo lo deciden siempre los informes (publisher_status.ts). Pero
   * ese registro no es inofensivo — `retention.ts` lo usa para decidir cuándo
   * se BORRAN los informes de alguien, así que dejarlo cerrado por error
   * estrecha su ventana de conservación.
   *
   * A quien ya está como debe no se le vuelve a guardar: escribir un registro
   * idéntico despierta la sincronización de toda la congregación para nada.
   */
  const handleUpdateInactiveState = async () => {
    const personsToSave = buildPublisherHistoryUpdates({
      active: getPublishersActive(month),
      inactive: getPublishersInactive(month),
      // Se cierra al final del mes informado, no del anterior (ver
      // lastDayOfReportMonth): quien aparece como publicador activo en este
      // S-1 tiene que seguir contando en este mes.
      endDate: lastDayOfReportMonth(month),
      startDate: dateFirstDayMonth(new Date(`${month}/01`)).toISOString(),
      hasMinistryData: congReports.length > 0,
    });

    if (personsToSave.length > 0) {
      await dbPersonsBulkSave(personsToSave);
    }
  };

  const handleLateReports = async () => {
    const lateReports = congReports.filter(
      (record) =>
        record.report_data.status === 'confirmed' &&
        record.report_data.late.value &&
        record.report_data.late.submitted.length === 0
    );

    const reportsToSave = lateReports.map((report) => {
      const obj = structuredClone(report);
      obj.report_data.late.submitted = month;

      return obj;
    });

    await dbFieldServiceReportsBulkSave(reportsToSave);
  };

  const handleS1 = async () => {
    // mark all late reports as submitted
    await handleLateReports();

    // save status
    const currentReport = reports.find(
      (record) => record.report_date === month
    );

    const report = structuredClone(currentReport);
    report.report_data.submitted = true;
    report.report_data.updatedAt = new Date().toISOString();

    await dbBranchFieldReportSave(report);

    // update publishers inactive state
    await handleUpdateInactiveState();
  };

  const handleS10 = async () => {
    const currentAnalysis = congAnalysis.find(
      (record) => record.report_date === year
    );

    const analyis = structuredClone(currentAnalysis);
    analyis.report_data.submitted = true;
    analyis.report_data.updatedAt = new Date().toISOString();

    await dbBranchCongAnalysisSave(analyis);
  };

  const handleSubmitted = async () => {
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

  return { handleSubmitted };
};

export default useSubmitReport;
