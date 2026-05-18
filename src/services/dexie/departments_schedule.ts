import appDb from '@db/appDb';
import { DeptWeekType } from '@definition/departments_schedule';

export const dbDeptScheduleGet = async (weekOf: string) => {
  const schedule = await appDb.departments_schedule.get(weekOf);
  return schedule || null;
};

export const dbDeptScheduleSave = async (data: DeptWeekType) => {
  await appDb.departments_schedule.put(data);
};

export const dbDeptScheduleGetAll = async () => {
  const schedules = await appDb.departments_schedule.toArray();
  return schedules;
};
