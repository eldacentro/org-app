import { useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { publisherCurrentReportState } from '@states/field_service_reports';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { CreditEntryType, creditEntryAdd } from '@services/app/credit_entries';

const useCreditField = () => {
  const creditRef = useRef<Element>(null);

  const [currentReport, setCurrentReport] = useAtom(
    publisherCurrentReportState
  );

  const branchReports = useAtomValue(branchFieldReportsState);

  const readOnly = useMemo(() => {
    const branchReport = branchReports.find(
      (record) => record.report_date === currentReport.report_data.report_date
    );

    if (!branchReport) return false;

    const isLate =
      currentReport?.report_data.late.value &&
      currentReport?.report_data.late.submitted.length === 0;

    if (isLate) return false;

    return branchReport.report_data.submitted;
  }, [branchReports, currentReport]);

  const credit = useMemo(() => {
    if (currentReport.report_data.hours.credit.approved > 0) {
      return currentReport.report_data.hours.credit.approved;
    }

    return currentReport.report_data.hours.credit.value;
  }, [currentReport]);

  const handleCreditChange = (value: number) => {
    const report = structuredClone(currentReport);

    report.report_data.hours.credit.approved = value;

    if (report.report_data.hours.field_service === 0) {
      report.report_data.shared_ministry = value > 0;
    }

    report.report_data.status = 'confirmed';
    report.report_data.updatedAt = new Date().toISOString();

    setCurrentReport(report);
  };

  const handleSelectPreset = (
    value: number,
    name: string,
    type: CreditEntryType
  ) => {
    const report = structuredClone(currentReport);

    report.report_data.hours.credit.approved = value;
    // El preset SUSTITUYE el crédito, así que su desglose también: una sola
    // entrada con su motivo. Sin ella no se sabría que es de la escuela de
    // precursores y se toparía a 55 como si fuera de LDC.
    report.report_data.hours.credit.entries = creditEntryAdd([], {
      type,
      hours: value,
      label: name,
    });

    if (report.report_data.hours.field_service === 0) {
      report.report_data.shared_ministry = true;
    }

    report.report_data.status = 'confirmed';
    report.report_data.updatedAt = new Date().toISOString();

    setCurrentReport(report);
  };

  return {
    credit,
    handleCreditChange,
    handleSelectPreset,
    creditRef,
    readOnly,
  };
};

export default useCreditField;
