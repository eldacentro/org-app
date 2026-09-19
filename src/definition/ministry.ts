/**
 * Las horas del mes de un precursor auxiliar: 30, o 15 en los meses en que la
 * sucursal lo permite. La solicitud dice CUÁL de las dos pide el hermano; el
 * orden es el de la lista del formulario, y el primero es el normal.
 */
export const AP_HORAS = [30, 15] as const;

export type APHours = (typeof AP_HORAS)[number];

export type APFormType = {
  months: string[];
  continuous: boolean;
  /**
   * DE QUIÉN es la solicitud. Casi siempre de quien la rellena; puede ser de
   * una persona delegada (un padre por su hija). Sin valor, de uno mismo.
   */
  person_uid?: string;
  /** 30 o 15. Sin valor (solicitudes de antes) se lee como 30. */
  hours?: APHours;
  date: Date;
  name: string;
  coordinator?: 'waiting' | 'approved' | 'rejected';
  secretary?: 'waiting' | 'approved' | 'rejected';
  service_overseer?: 'waiting' | 'approved' | 'rejected';
};

export type APRecordType = {
  continuous: boolean;
  /**
   * QUIÉN la envió, cuando no es el propio solicitante. Lo pone el servidor con
   * la cuenta que hizo la petición, así que no se puede falsear desde el móvil.
   * Viaja en claro, como `person_uid`: es un identificador, no un nombre.
   */
  submitted_by?: string;
  /** 30 o 15. Sin valor (solicitudes de antes) se lee como 30. */
  hours?: APHours;
  expired: string;
  months: string[];
  status?: string;
  notified?: boolean;
  submitted: string;
  updatedAt: string;
  person_uid: string;
  request_id: string;
  coordinator?: 'waiting' | 'approved' | 'rejected';
  secretary?: 'waiting' | 'approved' | 'rejected';
  service_overseer?: 'waiting' | 'approved' | 'rejected';
};

export type IncomingReport = {
  person_uid: string;
  bible_studies: number;
  comments: string;
  hours: number;
  hours_credits: number;
  report_month: string;
  shared_ministry: boolean;
  updatedAt: string;
  _deleted: boolean;
};
