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
    /**
     * Copia EN CLARO de `updatedAt`, para que el servidor pueda comparar.
     *
     * `updatedAt` viaja cifrado (está en el mapa de esta tabla), y el cifrado
     * lleva sal aleatoria: dos cifrados de la misma fecha no se parecen en
     * nada. El servidor, al fusionar informe a informe, comparaba esas cadenas
     * creyendo comparar fechas — o sea, echándolo a suertes. Con ~30
     * dispositivos y dos personas tocando informes, eso perdía ediciones.
     *
     * El nombre NO puede ser `updatedAt`: el mapa de cifrado casa por NOMBRE a
     * cualquier profundidad, así que un `updatedAt` en otro sitio se cifraría
     * igual. `rev` no está en ningún mapa, así que viaja tal cual — y un
     * dispositivo con la app vieja lo pasa de largo sin romperse, porque
     * `decryptObject` ignora lo que no reconoce.
     *
     * Opcional: los informes anteriores a esto no lo llevan, y el servidor
     * trata su ausencia como «no sé», sin inventarse un ganador.
     */
    rev?: string;
  };
};
