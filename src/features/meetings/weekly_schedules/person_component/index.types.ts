import { AssignmentFieldType } from '@definition/assignment';

export type PersonComponentProps = {
  label?: string;
  week: string;
  assignment?: AssignmentFieldType;
  schedule_id?: string;
  dataView?: string;
  color?: string;
  showCongregation?: boolean;
};

export type PersonDataType = {
  name: string;
  female?: boolean;
  active?: boolean;
  congregation?: string;
};

