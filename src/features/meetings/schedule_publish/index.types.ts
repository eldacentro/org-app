import { MeetingType } from '@definition/app';

export type SchedulePublishProps = {
  open: boolean;
  onClose: VoidFunction;
  type: MeetingType;
};

export type YearGroupType = {
  year: string;
  months: { month: string; weeks: string[] }[];
};

/** Una semana dentro del diálogo: qué es, cómo está y qué le falta. */
export type ScheduleWeekType = {
  weekOf: string;
  /** «2 Sep» — el día de la REUNIÓN, como en el selector del editor. */
  label: string;
  checked: boolean;
  /** La congregación ya la ve. */
  published: boolean;
  /** Es anterior al corte: nunca se publicó a mano y no se puede retirar. */
  isHistoric: boolean;
  /**
   * Las partes principales que están sin nadie. Vacío quiere decir que la
   * semana está entera — o que no reclama nada (cancelada, asamblea, visita
   * del superintendente).
   */
  missing: string[];
  /**
   * Le falta TODO: la semana está sin empezar. Se dice así y no con la lista
   * entera, que en ese caso es una pared de texto que no ayuda a nadie.
   */
  missingAll: boolean;
};

export type ScheduleListType = {
  year: string;
  months: {
    month: string;
    /** Todas sus semanas marcadas. */
    checked: boolean;
    /** Algunas sí y otras no. */
    indeterminate: boolean;
    /** Todas sus semanas publicadas. A medias NO cuenta como publicado. */
    published: boolean;
    isHistoric: boolean;
    weeks: ScheduleWeekType[];
  }[];
};
