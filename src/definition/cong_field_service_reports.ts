import { CreditEntry } from '@services/app/credit_entries';
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
      /**
       * Desglose del crédito por motivo (LDC, Escuela de Precursores, Otro…).
       * Opcional: los informes anteriores a esto no lo llevan y se muestran
       * con su total, sin inventarles un motivo.
       */
      entries?: CreditEntry[];
      };
    };
    bible_studies: number;
    comments: string;
    late: {
      value: boolean;
      submitted: string;
    };
    status: 'received' | 'confirmed';
    /**
     * Quién metió el informe, por su `person_uid`.
     *
     * Se guarda el identificador y no el nombre ni el cargo: el nombre lo
     * resuelve cada dispositivo por su cuenta, y el cargo se deduce de la
     * relación con el grupo del publicador (ver `reportAuthorRole`). Así no
     * hace falta un campo nuevo cifrado — este identificador no dice nada que
     * no diga ya `person_uid`, que viaja igual de claro.
     *
     * Opcional: los informes anteriores a esto no lo llevan, y ahí no se
     * inventa un autor. Un dispositivo con la app vieja que edite un informe
     * tampoco lo escribirá, y es correcto que se quede vacío: fue él quien lo
     * tocó el último y no sabe decirlo.
     */
    by?: string;
  };
};
