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
  /**
   * La pestaña de la izquierda, ya calculada. La usa Departamentos, donde «lo
   * mismo» no es un código de asignación sino un PUESTO (Micro 1, Exterior…) y
   * el filtro no se puede hacer aquí.
   */
  historyCurrent?: AssignmentHistoryType[];
  /** El rótulo de la pestaña de la derecha. Por defecto, «Todas». */
  allLabel?: string;
};
