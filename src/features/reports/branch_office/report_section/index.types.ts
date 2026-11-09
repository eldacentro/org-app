import { BranchReportType } from '@definition/branch_report';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { PersonType } from '@definition/person';
import { S1Category } from '@services/app/late_reports';

/** Un informe atrasado que suma (o sumó) el S-1, con su persona y su grupo. */
export type S1LateReport = {
  report: CongFieldServiceReportType;
  person: PersonType;
  category: S1Category;
};

export type LateReportsListProps = {
  reports: S1LateReport[];
  /** Atrasados que aún no se suman porque nadie los ha verificado. */
  unverified: S1LateReport[];
  /** El S-1 ya está enviado: se enseñan, pero ya no se tocan. */
  submitted: boolean;
  onRecordOnly: (report: CongFieldServiceReportType) => void;
  onVerify: (report: CongFieldServiceReportType) => void;
};

export type ReportSectionProps = {
  report: BranchReportType;
  onReportChange: (value: BranchReportType) => void;
  year: string;
  onYearChange: (value: string) => void;
  month: string;
  onMonthChange: (value: string) => void;
};
