import { atom } from 'jotai';
import { DeptWeekType } from '@definition/departments_schedule';

export const deptScheduleState = atom<DeptWeekType[]>([]);

export const selectedDeptWeekState = atom<string>('');
