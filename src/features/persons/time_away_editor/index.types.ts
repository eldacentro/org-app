import { TimeAwayType } from '@definition/person';

export type TimeAwayEditorProps = {
  items: TimeAwayType[];
  desc?: string;
  onAdd: VoidFunction;
  /** Las dos fechas juntas: guardarlas por separado pierde una de las dos. */
  onDatesChange: (id: string, start: Date, end: Date | null) => void;
  onCommentsChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
};
