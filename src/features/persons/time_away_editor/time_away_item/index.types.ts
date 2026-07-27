export type TimeAwayItemType = {
  start_date: string;
  end_date: string | null;
  comments: string;
  id: string;
  /** Las dos fechas juntas: guardarlas por separado pierde una de las dos. */
  onDatesChange: (id: string, start: Date, end: Date | null) => void;
  onCommentsChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
};
