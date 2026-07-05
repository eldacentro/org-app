export type PersonFixedFilterOption =
  | 'active'
  | 'inactive'
  | 'baptized'
  | 'unbaptized'
  | 'AP'
  | 'FR'
  | 'appointed';

export type PersonFilterOption = PersonFixedFilterOption | (string & {});

// Filtro independiente por estado del informe — se combina (AND) con
// PersonFilterOption en vez de ser una opción más de esa misma lista, para
// poder, por ejemplo, ver solo los precursores auxiliares con informe
// pendiente de verificación al mismo tiempo.
export type ReportStatusFilterOption =
  | ''
  | 'not_submitted'
  | 'unverified'
  | 'verified';

export type CongFieldServiceReportType = {
  report_id: string;
  report_data: {
    _deleted: boolean;
    updatedAt: string;
    report_date: string;
    person_uid: string;
    shared_ministry: boolean;
    hours: {
      field_service: number;
      credit: {
        value: number;
        approved: number;
      };
    };
    bible_studies: number;
    comments: string;
    late: {
      value: boolean;
      submitted: string;
    };
    status: 'received' | 'confirmed';
  };
};
