import { Table } from 'dexie';
import { DeptWeekType } from '@definition/departments_schedule';

export type DeptScheduleTable = {
  departments_schedule: Table<DeptWeekType>;
};

export const departmentsScheduleSchema = {
  departments_schedule: 'weekOf',
};
