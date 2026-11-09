import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { publisherCurrentReportState } from '@states/field_service_reports';
import { shortDateFormatState } from '@states/settings';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { formatDate } from '@utils/date';
import { lateStateOf, recordOnlyLate } from '@services/app/late_reports';

/**
 * Las casillas «Informe atrasado» y «Solo para su tarjeta» del editor de la
 * tarjeta del publicador. Lo mismo que en Informes de predicación —ver allí
 * el porqué—, pero sobre el informe que se está editando, que se guarda con
 * el botón del editor.
 */
const useLateReport = () => {
  const { t } = useAppTranslation();

  const [currentReport, setCurrentReport] = useAtom(
    publisherCurrentReportState
  );

  const shortDateFormat = useAtomValue(shortDateFormatState);
  const branchReports = useAtomValue(branchFieldReportsState);

  const branch_submitted = useMemo(() => {
    const report = branchReports.find(
      (record) => record.report_date === currentReport.report_data.report_date
    );

    if (!report) return false;

    return report.report_data.submitted;
  }, [branchReports, currentReport]);

  const state = lateStateOf(currentReport);

  // Ya salió con un S-1: no se toca. Antes bastaba con que `submitted` no
  // estuviera vacío, y eso bloqueaba también el de «solo para su tarjeta».
  const readOnly = state === 'sent';

  const checked = state === 'pending' || state === 'sent';

  const record_only = state === 'record_only';

  const show_late = useMemo(() => {
    if (currentReport.report_data.late.value) return true;

    if (!branch_submitted) return true;

    return branch_submitted && !currentReport.report_data.shared_ministry;
  }, [currentReport, branch_submitted]);

  // Solo hace falta con el mes ya enviado: si no, el informe se edita sin más
  // y no se suma a ningún S-1 posterior.
  const show_record_only =
    state === 'record_only' || (branch_submitted && state !== 'sent');

  const late_sent = useMemo(() => {
    if (state === 'record_only') return t('tr_recordOnlyNote');

    if (state !== 'sent') return '';

    const [year, month] = currentReport.report_data.late.submitted.split('/');
    const dateSent = new Date(+year, +month, 0);
    const sent = formatDate(dateSent, shortDateFormat);

    return t('tr_lateReportSent', { date: sent });
  }, [currentReport, state, t, shortDateFormat]);

  const update = (late: typeof currentReport.report_data.late) => {
    const lateReport = structuredClone(currentReport);
    lateReport.report_data.late = late;
    lateReport.report_data.status = 'confirmed';

    // Con el mes enviado, desmarcar las dos casillas deja un informe «normal»
    // en un mes cerrado: no se suma a ningún S-1, sus campos se bloquean y las
    // casillas desaparecen, sin forma de arreglarlo. Se vacía, como hace
    // Informes de predicación al desmarcar: queda «no participó» y las
    // casillas siguen a mano.
    if (!late.value && branch_submitted) {
      lateReport.report_data.shared_ministry = false;
      lateReport.report_data.bible_studies = 0;
      lateReport.report_data.comments = '';
      lateReport.report_data.hours = {
        ...lateReport.report_data.hours,
        field_service: 0,
        credit: { value: 0, approved: 0 },
      };
    }

    lateReport.report_data.updatedAt = new Date().toISOString();

    setCurrentReport(lateReport);
  };

  const handleChecked = async (value: boolean) => {
    update({ value, submitted: '' });
  };

  const handleRecordOnly = async (value: boolean) => {
    update(
      value
        ? recordOnlyLate(currentReport.report_data.report_date)
        : { value: false, submitted: '' }
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
    branch_submitted,
  };
};

export default useLateReport;
