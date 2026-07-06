import appDb from '@db/appDb';
import { UpdateSpec } from 'dexie';
import { SchedWeekType } from '@definition/schedules';
type SchedChanges = UpdateSpec<SchedWeekType> & Record<string, unknown>;
import { store } from '@states/index';
import { fullnameState } from '@states/settings';
import { scheduleSchema } from './schema';

const dbUpdateSchedulesMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.schedules = {
    ...metadata.metadata.schedules,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbSchedGet = async (weekOf: string) => {
  const schedule = await appDb.sched.get(weekOf);
  return schedule;
};

export const dbSchedUpdate = async (
  weekOf: string,
  changes: SchedChanges
) => {
  const fullname = store.get(fullnameState);

  changes.updatedAt = new Date().toISOString();
  changes.lastModifiedBy = fullname;

  await appDb.sched.update(weekOf, changes);
  await dbUpdateSchedulesMetadata();
};

export const dbSchedCheck = async (weekOf: string) => {
  const findSched = await appDb.sched.get(weekOf);

  if (!findSched) {
    const newSched = structuredClone(scheduleSchema);
    newSched.weekOf = weekOf;

    await appDb.sched.put(newSched);
    await dbUpdateSchedulesMetadata();
  }
};

export const dbSchedBulkUpdate = async (weeks: SchedWeekType[]) => {
  const fullname = store.get(fullnameState);
  const updatedAt = new Date().toISOString();

  const data = weeks.map((sched) => {
    sched.updatedAt = updatedAt;
    sched.lastModifiedBy = fullname;

    return { key: sched.weekOf, changes: sched };
  });

  await appDb.sched.bulkUpdate(data);
  await dbUpdateSchedulesMetadata();
};

export const dbSchedAuxClassUpdate = async () => {
  const schedules = await appDb.sched.toArray();

  const schedulesUpdate: SchedWeekType[] = [];

  for (const schedule of schedules) {
    if (!schedule.midweek_meeting) continue;

    const obj = structuredClone(schedule);

    const midweek = obj.midweek_meeting;

    if (Array.isArray(midweek.chairman.aux_class_1)) {
      midweek.chairman.aux_class_1 = midweek.chairman.aux_class_1[0];
    }

    if (Array.isArray(midweek.tgw_bible_reading.aux_class_1)) {
      midweek.tgw_bible_reading.aux_class_1 =
        midweek.tgw_bible_reading.aux_class_1[0];
    }

    if (Array.isArray(midweek.tgw_bible_reading.aux_class_2)) {
      midweek.tgw_bible_reading.aux_class_2 =
        midweek.tgw_bible_reading.aux_class_2[0];
    }

    if (Array.isArray(midweek.ayf_part1.aux_class_1)) {
      midweek.ayf_part1.aux_class_1 = midweek.ayf_part1.aux_class_1[0];
    }

    if (Array.isArray(midweek.ayf_part1.aux_class_2)) {
      midweek.ayf_part1.aux_class_2 = midweek.ayf_part1.aux_class_2[0];
    }

    if (Array.isArray(midweek.ayf_part2.aux_class_1)) {
      midweek.ayf_part2.aux_class_1 = midweek.ayf_part2.aux_class_1[0];
    }

    if (Array.isArray(midweek.ayf_part2.aux_class_2)) {
      midweek.ayf_part2.aux_class_2 = midweek.ayf_part2.aux_class_2[0];
    }

    if (Array.isArray(midweek.ayf_part3.aux_class_1)) {
      midweek.ayf_part3.aux_class_1 = midweek.ayf_part3.aux_class_1[0];
    }

    if (Array.isArray(midweek.ayf_part3.aux_class_2)) {
      midweek.ayf_part3.aux_class_2 = midweek.ayf_part3.aux_class_2[0];
    }

    schedulesUpdate.push(obj);
  }

  await appDb.sched.bulkPut(schedulesUpdate);
  await dbUpdateSchedulesMetadata();
};

export const dbSchedUpdateOutgoingTalksFields = async () => {
  const schedules = await appDb.sched.toArray();

  const data = schedules.map((sched) => {
    if (!sched.weekend_meeting) {
      return { key: sched.weekOf, changes: sched };
    }

    const talks = sched.weekend_meeting.outgoing_talks ?? [];

    const outgoing_talks = talks.map((talk) => {
      const fixed = talk.value
        ? talk
        : {
            ...talk,
            value: talk['speaker'] || '',
            type: talk.type || 'main',
          };

      // Migración de tipo (no de valor): registros legados guardaron
      // public_talk como string ('42') en vez de number — las comparaciones
      // en la app usan === estricto en unos sitios y Number() en otros, así
      // que un string legado podía no coincidir en los primeros.
      if (
        fixed.public_talk !== null &&
        fixed.public_talk !== undefined &&
        typeof fixed.public_talk === 'string' &&
        (fixed.public_talk as string).trim() !== '' &&
        !Number.isNaN(Number(fixed.public_talk))
      ) {
        fixed.public_talk = Number(fixed.public_talk);
      }

      return fixed;
    });

    sched.weekend_meeting.outgoing_talks = outgoing_talks;

    return { key: sched.weekOf, changes: sched };
  });

  await appDb.sched.bulkUpdate(data);
  await dbUpdateSchedulesMetadata();
};
