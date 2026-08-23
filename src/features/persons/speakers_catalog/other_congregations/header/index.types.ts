export type IncomingCongregationHeaderType = {
  expanded: boolean;
  onExpandChange: (value: string) => void;
  editMode: boolean;
  onEditModeChange: VoidFunction;
  cong_name: string;
  cong_number: string;
  /** El circuito, si toca enseñarlo. Ver `showCircuit`. */
  cong_circuit?: string;
  onDelete: VoidFunction;
};
