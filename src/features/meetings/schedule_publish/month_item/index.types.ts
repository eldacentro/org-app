import { ScheduleListType } from '../index.types';

export type MonthItemProps = {
  data: ScheduleListType['months'][number];
  onChange: (checked: boolean, value: string) => void;
};
