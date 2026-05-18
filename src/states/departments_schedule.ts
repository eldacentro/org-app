import { atom } from 'jotai';
import { DeptWeekType } from '@definition/departments_schedule';
import { dbDeptScheduleGetAll } from '@services/dexie/departments_schedule';

export const deptScheduleState = atom<DeptWeekType[]>(await dbDeptScheduleGetAll());

export const selectedDeptWeekState = atom<string>('');
