import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { publisherCurrentReportState } from '@states/field_service_reports';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { editableAfterMonthSent } from '@services/app/late_reports';

const useBibleStudies = () => {
  const [currentReport, setCurrentReport] = useAtom(
    publisherCurrentReportState
  );

  const branchReports = useAtomValue(branchFieldReportsState);

  const readOnly = useMemo(() => {
    const branchReport = branchReports.find(
      (record) => record.report_date === currentReport.report_data.report_date
    );

    if (!branchReport) return false;

    // Con el mes enviado se sigue editando el atrasado que aún no ha salido y
    // el que es solo para la tarjeta (ver `editableAfterMonthSent`).
    if (editableAfterMonthSent(currentReport)) return false;

    return branchReport.report_data.submitted;
  }, [branchReports, currentReport]);

  const bible_studies = useMemo(() => {
    return currentReport.report_data.bible_studies;
  }, [currentReport]);

  const handleBibleStudyChange = (value: number) => {
    const report = structuredClone(currentReport);

    report.report_data.bible_studies = value;

    if (report.report_data.hours.field_service === 0) {
      report.report_data.shared_ministry = value > 0;
    }

    report.report_data.status = 'confirmed';
    report.report_data.updatedAt = new Date().toISOString();

    setCurrentReport(report);
  };

  return { bible_studies, handleBibleStudyChange, readOnly };
};

export default useBibleStudies;
