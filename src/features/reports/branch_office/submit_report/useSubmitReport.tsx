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
import { s1Differs, s1PendingCounted } from '@services/app/late_reports';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { useAppTranslation } from '@hooks/index';
import useS1Live from '../useS1Live';

const useSubmitReport = ({ onClose }: SubmitReportProps) => {
  const { t } = useAppTranslation();

  const { compute } = useS1Live();

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

  /**
   * Los atrasados que salen con este S-1 quedan marcados con su mes, para no
   * volver a sumarse en el siguiente.
   *
   * Son EXACTAMENTE los que el S-1 sumó (`s1PendingCounted`), calculados igual
   * que al generarlo. Antes era un filtro aparte que se llevaba también los que
   * no se habían sumado (sin participación, sin verificar, de precursores
   * especiales…), y esos ya no salían nunca.
   *
   * Y con `updatedAt` nuevo: el servidor solo acepta un informe si su fecha es
   * más reciente que la que tiene. Sin cambiarla, la marca se quedaba en este
   * dispositivo, el servidor seguía teniendo el atrasado como pendiente, y en
   * cuanto volvía a bajar se sumaba otra vez al S-1 del mes siguiente.
   */
  const handleLateReports = async (counted: CongFieldServiceReportType[]) => {
    const now = new Date().toISOString();

    const reportsToSave = counted.map((report) => {
      const obj = structuredClone(report);
      obj.report_data.late = { value: true, submitted: month };
      obj.report_data.updatedAt = now;

      return obj;
    });

    await dbFieldServiceReportsBulkSave(reportsToSave);
  };

  const handleS1 = async () => {
    const currentReport = reports.find(
      (record) => record.report_date === month
    );

    // Lo que se marca como enviado tiene que ser lo que está en pantalla. Si
    // los datos han cambiado desde que se generó, no se envía: el botón ya se
    // bloquea en ese caso, esto es por si cambian con el diálogo abierto.
    const live = compute();

    if (s1Differs(currentReport.report_data, live.data)) {
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: t('tr_s1Stale'),
        severity: 'error',
      });

      return;
    }

    // Los atrasados que este S-1 sumó salen con él.
    await handleLateReports(s1PendingCounted(live.result));

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
