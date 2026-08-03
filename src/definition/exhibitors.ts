import type { PublishedMonthsAt } from '@services/app/month_publish';

export type ExhibitorTurnType = {
  id: string; // ID único auto-generado (UUID)
  days: string[]; // ['tuesday', 'saturday'] etc.
  startTime: string; // "10:00"
  endTime: string; // "12:00"
  locations: string[]; // Opciones específicas de ubicación
  defaultLocation: string;
};

export type ExhibitorSettingsType = {
  weekOf: 'settings';
  updatedAt?: string;
  lastModifiedBy?: string;
  turns: ExhibitorTurnType[];
  monthlyOverrides?: Record<string, ExhibitorTurnType[] | { isCancelledMonth: boolean; cancelledMessage?: string }>; // YYYY/MM key
  locations: string[]; // Listado global de ubicaciones de exhibidores
  responsibles: string[]; // Array de person_uids habilitados como responsables de turno
  fixedAssignments: {
    turnId: string;
    day?: string;
    personUid: string;
    isResponsible: boolean;
    position?: number;
  }[];
  availability: {
    [person_uid: string]: string[]; // Array de turnIds preferidos por cada hermano
  };
  /**
   * Meses ya publicados ('YYYY/MM'). Un mes que no esté aquí está en BORRADOR:
   * solo lo ve quien puede editarlo. Ver `services/app/exhibitors_publish`.
   */
  publishedMonths?: string[];
  /**
   * Cuándo se publicó cada mes ('YYYY/MM' → fecha ISO). `publishedMonths` dice
   * SI está publicado; esto dice DESDE CUÁNDO, que es lo único que permite
   * contestar «lo he tocado después de publicarlo». Un mes publicado antes de
   * que esto existiera no tiene sello, y entonces no se dice nada: no se sabe.
   * Ver `services/app/month_publish`.
   */
  publishedMonthsAt?: PublishedMonthsAt;
};

export type ExhibitorWeekAssignmentType = {
  person: string; // person_uid
  isResponsible: boolean;
};

export type ExhibitorWeekTurnType = {
  turnId: string;
  date: string; // "YYYY/MM/DD"
  assignments: ExhibitorWeekAssignmentType[];
  location: string;
  cancelled: boolean;
};

export type ExhibitorWeekType = {
  weekOf: string; // "YYYY/MM/DD" (Lunes de la semana correspondiente)
  updatedAt?: string;
  lastModifiedBy?: string;
  turns: ExhibitorWeekTurnType[];
};
