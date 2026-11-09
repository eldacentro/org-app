import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import {
  congFieldServiceReportsState,
  selectedMonthFieldServiceReportState,
} from '@states/field_service_reports';
import { PersonType } from '@definition/person';
import { shortDateFormatState } from '@states/settings';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { congFieldServiceReportSchema } from '@services/dexie/schema';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { handleSaveFieldServiceReports } from '@services/app/cong_field_service_reports';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { formatDate } from '@utils/date';
import { lateStateOf, recordOnlyLate } from '@services/app/late_reports';
import Sentry from '@services/sentry';
import useReportEditScope from '@hooks/useReportEditScope';

/**
 * Las dos casillas de un informe que se mete con su mes ya enviado.
 *
 * Antes había una sola, «Informe atrasado», y era la ÚNICA manera de
 * desbloquear un mes enviado. Al copiar la tarjeta de quien llega de otra
 * congregación había que marcarla para poder escribir, y esos meses —que ya
 * había contado su congregación anterior— se sumaban al S-1 siguiente. Ahora
 * se elige qué es:
 *
 *  - «Informe atrasado»: de aquí, no se entregó a tiempo, se suma al próximo
 *    informe a la sucursal.
 *  - «Solo para su tarjeta»: queda en su registro y no se suma a ninguno.
 *
 * Son excluyentes. Marcar una desmarca la otra sin perder lo escrito;
 * desmarcar la que está puesta vacía el informe, como hacía siempre la casilla
 * de atrasado.
 */
const useLateReport = (person: PersonType) => {
  const { t } = useAppTranslation();

  const { isSecretary } = useCurrentUser();

  const { canEditReportOf } = useReportEditScope();

  const reports = useAtomValue(congFieldServiceReportsState);
  const currentMonth = useAtomValue(selectedMonthFieldServiceReportState);
  const shortDateFormat = useAtomValue(shortDateFormatState);
  const branchReports = useAtomValue(branchFieldReportsState);

  const branch_submitted = useMemo(() => {
    const report = branchReports.find(
      (record) => record.report_date === currentMonth
    );

    if (!report) return false;

    return report.report_data.submitted;
  }, [branchReports, currentMonth]);

  const report = useMemo(() => {
    return reports.find(
      (record) =>
        record.report_data.report_date === currentMonth &&
        record.report_data.person_uid === person.person_uid
    );
  }, [reports, currentMonth, person]);

  const state = lateStateOf(report);

  // Las mismas manos que el formulario (`useReportEditScope`): un anciano que
  // ve el informe de otro grupo no puede marcarlo. Si pudiera, quedaría
  // guardado en su móvil y el servidor lo descartaría.
  const canEdit = canEditReportOf(person.person_uid);

  // Ya salió con un S-1: no se toca.
  const readOnly = state === 'sent' || !canEdit;

  const checked = state === 'pending' || state === 'sent';

  const record_only = state === 'record_only';

  const show_late = useMemo(() => {
    if (!report) {
      if (branch_submitted) return true;

      return false;
    }

    if (report.report_data.late.value) return true;

    return branch_submitted && !report.report_data.shared_ministry;
  }, [report, branch_submitted]);

  // Apartarlo para la tarjeta solo tiene sentido mientras no haya salido.
  const show_record_only = show_late && state !== 'sent';

  const late_sent = useMemo(() => {
    let lateSubmitted = '';

    try {
      if (!report) return '';

      if (state === 'record_only') return t('tr_recordOnlyNote');

      if (state !== 'sent') return '';

      lateSubmitted = report.report_data.late.submitted;

      const [year, month] = lateSubmitted.split('/');
      const dateSent = new Date(+year, +month, 0);
      const sent = formatDate(dateSent, shortDateFormat);

      return t('tr_lateReportSent', { date: sent });
    } catch (error) {
      console.error('Error calculating late_sent:', lateSubmitted);
      Sentry.captureException(error);

      return t('tr_lateReportSent', { date: 'date_error' });
    }
  }, [report, state, t, shortDateFormat]);

  const save = async (
    late: CongFieldServiceReportType['report_data']['late']
  ) => {
    if (!canEdit) return;

    try {
      let lateReport: CongFieldServiceReportType;

      if (!report) {
        lateReport = structuredClone(congFieldServiceReportSchema);
        lateReport.report_id = crypto.randomUUID();
        lateReport.report_data.report_date = currentMonth;
        lateReport.report_data.person_uid = person.person_uid;
      }

      if (report) {
        lateReport = structuredClone(report);
      }

      lateReport.report_data.late = late;

      if (late.value) {
        lateReport.report_data.status = isSecretary ? 'confirmed' : 'received';
      }

      if (!late.value) {
        lateReport.report_data.status = 'confirmed';
        lateReport.report_data.shared_ministry = false;
        lateReport.report_data.bible_studies = 0;
        lateReport.report_data.comments = '';
        lateReport.report_data.hours = {
          credit: { approved: 0, value: 0 },
          field_service: 0,
        };
      }

      lateReport.report_data.updatedAt = new Date().toISOString();

      await handleSaveFieldServiceReports(lateReport);
    } catch (error) {
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleChecked = async (value: boolean) => {
    await save({ value, submitted: '' });
  };

  const handleRecordOnly = async (value: boolean) => {
    await save(
      value ? recordOnlyLate(currentMonth) : { value: false, submitted: '' }
    );
  };

  return {
    show_late,
    show_record_only,
    late_sent,
    checked,
    record_only,
    handleChecked,
    handleRecordOnly,
    readOnly,
  };
};

export default useLateReport;
