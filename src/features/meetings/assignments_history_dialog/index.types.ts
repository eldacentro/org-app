import { AssignmentCode } from '@definition/assignment';
import { AssignmentHistoryType } from '@definition/schedules';

export type AssignmentsHistoryDialogType = {
  open: boolean;
  onClose: VoidFunction;
  person: string;
  history: AssignmentHistoryType[];
  /**
   * La asignación desde la que se abrió el historial. Sin ella no hay nada que
   * separar y el diálogo se queda como estaba, sin pestañas.
   */
  assignmentType?: AssignmentCode;
  /** El rótulo de esa pestaña. Por defecto, «Esta asignación». */
  assignmentLabel?: string;
};
