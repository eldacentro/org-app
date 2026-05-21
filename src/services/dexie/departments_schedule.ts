import appDb from '@db/appDb';
import { DeptWeekType } from '@definition/departments_schedule';
import { store } from '@states/index';
import { fullnameState } from '@states/settings';

const dbUpdateSchedulesMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.schedules = {
    ...metadata.metadata.schedules,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbDeptScheduleGet = async (weekOf: string) => {
  const schedule = await appDb.departments_schedule.get(weekOf);
  return schedule || null;
};

export const dbDeptScheduleSave = async (data: DeptWeekType) => {
  const fullname = store.get(fullnameState);
  data.updatedAt = new Date().toISOString();
  data.lastModifiedBy = fullname;

  await appDb.departments_schedule.put(data);
  await dbUpdateSchedulesMetadata();
};

export const dbDeptScheduleBulkSave = async (data: DeptWeekType[]) => {
  const fullname = store.get(fullnameState);
  const updatedAt = new Date().toISOString();

  for (const record of data) {
    record.updatedAt = updatedAt;
    record.lastModifiedBy = fullname;
  }

  await appDb.departments_schedule.bulkPut(data);
  await dbUpdateSchedulesMetadata();
};

export const dbDeptScheduleGetAll = async () => {
  const schedules = await appDb.departments_schedule.toArray();
  return schedules;
};
