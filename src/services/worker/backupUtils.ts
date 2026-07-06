// to minimize the size of the worker file, we recreate all its needed functions in this file

import appDb from '@db/appDb';
import { BackupDataType, CongUserType } from './backupType';
import {
  decryptData,
  decryptObject,
  encryptData,
  encryptObject,
  generateKey,
} from '@services/encryption';
import { PersonType, PrivilegeType } from '@definition/person';
import {
  OutgoingTalkExportScheduleType,
  OutgoingTalkScheduleType,
  SchedWeekType,
} from '@definition/schedules';
import { DeptWeekType } from '@definition/departments_schedule';
import { ServiceOutingWeekType } from '@definition/service_outings';
import { ExhibitorWeekType } from '@definition/exhibitors';
import { CircuitVisitType } from '@definition/circuit_visit';
import { ResponsabilidadesType } from '@definition/responsabilidades';
import { LimpiezaConfig } from '@definition/limpieza';
import { PlanEvacuacion } from '@definition/evacuacion';
import { PublicTalkOverrideType } from '@definition/public_talks';
import { applyPublicTalksOverride } from '@utils/public_talks';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { SettingsType } from '@definition/settings';
import { SourceWeekType } from '@definition/sources';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { UserBibleStudyType } from '@definition/user_bible_studies';
import { UserFieldServiceReportType } from '@definition/user_field_service_reports';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { BranchFieldServiceReportType } from '@definition/branch_field_service_reports';
import { BranchCongAnalysisType } from '@definition/branch_cong_analysis';
import { MeetingAttendanceType } from '@definition/meeting_attendance';
import { MetadataRecordType } from '@definition/metadata';
import { DelegatedFieldServiceReportType } from '@definition/delegated_field_service_reports';
import { UpcomingEventType } from '@definition/upcoming_events';
import { formatDate } from '@utils/date';
import { APP_READ_ONLY_ROLES } from '@constants/index';
import {
  reconcileOutgoingSpeakerLinks,
  remapOutgoingTalkAssignments,
  resolveLocalCongId,
  tokenize,
} from '@services/app/visiting_speakers_reconcile';


const personIsMS = (person: PersonType) => {
  const hasActive = person?.person_data.privileges?.find(
    (record) =>
      record.privilege === 'ms' &&
      record.end_date === null &&
      record._deleted === false
  );

  return hasActive ? true : false;
};

const personIsBaptizedPublisher = (person: PersonType, month?: string) => {
  // default month to current month if undefined
  if (!month) {
    month = formatDate(new Date(), 'yyyy/MM');
  }

  const isValid = person.person_data.publisher_baptized.history.some(
    (record) => {
      if (record._deleted) return false;
      if (!record.start_date) return false;

      const startDate = new Date(record.start_date);
      const endDate = record.end_date
        ? new Date(record.end_date)
        : new Date(`${month}/01`);

      const startMonth = formatDate(startDate, 'yyyy/MM');
      const endMonth = formatDate(endDate, 'yyyy/MM');

      return month >= startMonth && month <= endMonth;
    }
  );

  return isValid;
};

const personIsUnbaptizedPublisher = (person: PersonType, month?: string) => {
  // default month to current month if undefined
  if (!month) {
    month = formatDate(new Date(), 'yyyy/MM');
  }

  const isValid = person.person_data.publisher_unbaptized.history.some(
    (record) => {
      if (record._deleted) return false;
      if (!record.start_date) return false;

      const startDate = new Date(record.start_date);
      const endDate = record.end_date
        ? new Date(record.end_date)
        : new Date(`${month}/01`);

      const startMonth = formatDate(startDate, 'yyyy/MM');
      const endMonth = formatDate(endDate, 'yyyy/MM');

      return month >= startMonth && month <= endMonth;
    }
  );

  return isValid;
};

const personIsPrivilegeActive = (
  person: PersonType,
  privilege: PrivilegeType,
  month?: string
) => {
  if (!month) {
    const isActive = person.person_data.privileges.some(
      (record) =>
        record.privilege === privilege &&
        record.end_date === null &&
        record._deleted === false
    );

    return isActive;
  }

  const history = person.person_data.privileges.filter(
    (record) =>
      record._deleted === false &&
      record.privilege === privilege &&
      record.start_date?.length > 0
  );

  const isActive = history.some((record) => {
    const startDate = new Date(record.start_date);
    const endDate = record.end_date
      ? new Date(record.end_date)
      : new Date(`${month}/01`);

    const startMonth = formatDate(startDate, 'yyyy/MM');
    const endMonth = formatDate(endDate, 'yyyy/MM');

    return month >= startMonth && month <= endMonth;
  });

  return isActive;
};

const syncFromRemote = <T extends object>(local: T, remote: T): T => {
  const arrayKeys = Object.keys(remote).filter(
    (key) => remote[key] !== null && Array.isArray(remote[key])
  );

  // 'id' must win when present: it's the only key guaranteed unique for
  // dynamic, repeatable lists like weekend_meeting.outgoing_talks (multiple
  // records can legitimately share the same 'type', e.g. the same dataView).
  // Fixed-slot records (chairman, opening_prayer, etc.) have no 'id' and
  // fall through to 'type' as before.
  const lockKeys = ['id', 'type', 'talk_number'];

  for (const key of arrayKeys) {
    if (!local[key]) {
      local[key] = remote[key];
      continue;
    }

    if (!Array.isArray(local[key])) {
      local[key] = remote[key];
      continue;
    }

    for (const remoteValue of remote[key]) {
      if (typeof remoteValue !== 'object') {
        continue;
      }

      for (const lockKey of lockKeys) {
        if (lockKey in remoteValue) {
          const localValue = local[key].find(
            (r) => r[lockKey] === remoteValue[lockKey]
          );

          if (!localValue) {
            local[key].push(remoteValue);
          } else {
            if ('updatedAt' in localValue) {
              if (
                !localValue.updatedAt ||
                remoteValue.updatedAt > localValue.updatedAt
              ) {
                Object.assign(localValue, remoteValue);
              }
            } else if ('updatedAt' in remoteValue) {
              Object.assign(localValue, remoteValue);
            }

            if (!('updatedAt' in localValue)) {
              syncFromRemote(localValue, remoteValue);
            }
          }

          break;
        }
      }
    }
  }

  const objectKeys = Object.keys(remote).filter(
    (key) =>
      remote[key] !== null &&
      !Array.isArray(remote[key]) &&
      typeof remote[key] === 'object'
  );

  for (const key of objectKeys) {
    if (local[key]) {
      if ('updatedAt' in remote[key]) {
        if (
          !local[key].updatedAt ||
          remote[key].updatedAt > local[key].updatedAt
        ) {
          local[key] = remote[key];
        }
      } else {
        syncFromRemote(local[key], remote[key]);
      }
    } else {
      local[key] = remote[key];
    }
  }

  const primitiveKeys = Object.keys(remote).filter(
    (key) => typeof remote[key] !== 'object'
  );

  for (const key of primitiveKeys) {
    local[key] = remote[key];
  }

  return local;
};

export const dbGetSettings = async () => {
  const settings = await appDb.app_settings.get(1);

  return settings;
};

export const isMondayDate = (date: string) => {
  if (!date) return false;
  const separator = date.includes('/') ? '/' : '-';
  const parts = date.split(separator);
  if (parts.length < 3) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  const inputDate = new Date(year, month - 1, day);
  return inputDate.getDay() === 1;
};

export const dbGetMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return {};

  const result = {} as Record<string, string>;

  for (const [key, value] of Object.entries(metadata.metadata)) {
    result[key] = value.version;
  }

  const settings = await dbGetSettings();
  const accountType = settings.user_settings.account_type;
  const userRole = settings.user_settings.cong_role;

  const isSecretary = userRole.includes('secretary');
  const isCoordinator = userRole.includes('coordinator');
  const isAdmin = userRole.includes('admin') || isSecretary || isCoordinator;
  const isPublisher = isAdmin || userRole.includes('publisher');
  const isGroupOverseer = isAdmin || userRole.includes('group_overseers');
  const isLanguageGroupOverseer =
    isAdmin || userRole.includes('language_group_overseers');
  const isElder =
    accountType === 'vip' && (isAdmin || userRole.includes('elder'));
  const isScheduleEditor =
    isAdmin ||
    isGroupOverseer ||
    userRole.some(
      (role) =>
        role === 'midweek_schedule' ||
        role === 'weekend_schedule' ||
        role === 'public_talk_schedule'
    );

  const isServiceCommittee = isAdmin || userRole.includes('service_overseer');
  const isPersonViewer = isScheduleEditor || isElder || isServiceCommittee;
  const isPersonMinimal = !isPersonViewer;

  const isAttendanceTracker =
    isAdmin || userRole.some((role) => role === 'attendance_tracking');

  if (!isPublisher) {
    delete result.user_bible_studies;
    delete result.user_field_service_reports;
    delete result.delegated_field_service_reports;
    delete result.cong_field_service_reports;
  }

  // Schedule editors/viewers (not only elders) need the visiting speakers so
  // the weekend schedule can resolve their names. Keep these tables in the
  // sync metadata for them so delta sync works.
  if (!isElder && !isScheduleEditor) {
    delete result.speakers_congregations;
    delete result.visiting_speakers;
  }

  if (isPersonViewer) {
    delete result.public_sources;
    delete result.public_schedules;
  }

  if (isPersonMinimal) {
    delete result.sources;
    delete result.schedules;
    // departments_schedule is kept: the read-only Departments tab in weekly
    // schedules is visible to every publisher (the editor page is role-gated
    // separately in the router).
  }

  if (!isPersonViewer) {
    delete result.persons;
  }

  if (!isAttendanceTracker && !isLanguageGroupOverseer) {
    delete result.meeting_attendance;
  }

  if (!isSecretary) {
    delete result.incoming_reports;
  }

  if (!isAdmin) {
    delete result.branch_cong_analysis;
    delete result.branch_field_service_reports;
  }

  return result;
};

const dbGetTableData = async () => {
  return await appDb.transaction('r', appDb.tables, async () => {
    const settings = await dbGetSettings();
    const persons = await appDb.persons.toArray();
    const cong_field_service_reports =
      await appDb.cong_field_service_reports.toArray();
    const field_service_groups = await appDb.field_service_groups.toArray();
    const visiting_speakers = await appDb.visiting_speakers.toArray();
    const speakers_congregations = await appDb.speakers_congregations.toArray();
    const user_bible_studies = await appDb.user_bible_studies.toArray();
    const user_field_service_reports =
      await appDb.user_field_service_reports.toArray();
    const delegated_field_service_reports =
      await appDb.delegated_field_service_reports.toArray();
    const branch_cong_analysis = await appDb.branch_cong_analysis.toArray();
    const branch_field_service_reports =
      await appDb.branch_field_service_reports.toArray();
    const sched = await appDb.sched.toArray();
    const departments_schedule = await appDb.departments_schedule.toArray();
    const service_outings = await appDb.service_outings.toArray();
    const exhibitors = await appDb.exhibitors.toArray();
    const responsabilidades = await appDb.responsabilidades.toArray();
    const sources = await appDb.sources.toArray();
    const meeting_attendance = await appDb.meeting_attendance.toArray();
    const upcoming_events = await appDb.upcoming_events.toArray();
    const limpieza_config = await appDb.limpieza_config.get('1');
    const evacuacion_config = await appDb.evacuacion_config.get('1');
    const public_talks_override = await appDb.public_talks_override.get('1');
    const metadata = await appDb.metadata.get(1);

    const territories = await appDb.territories.toArray();
    const territory_zones = await appDb.territory_zones.toArray();
    const territory_tags = await appDb.territory_tags.toArray();
    const territory_assignments = await appDb.territory_assignments.toArray();
    const territory_campaigns = await appDb.territory_campaigns.toArray();
    const territory_notices = await appDb.territory_notices.toArray();
    const territory_requests = await appDb.territory_requests.toArray();
    const territory_settings = await appDb.territory_settings.toArray();
    const circuit_overseer_visits =
      await appDb.circuit_overseer_visits.toArray();

    const congId = speakers_congregations.find(
      (record) =>
        record.cong_data.cong_name.value === settings.cong_settings.cong_name
    )?.id;

    const outgoing_speakers = visiting_speakers
      .filter((record) => {
        const person = persons.find((p) => p.person_uid === record.person_uid);

        if (!person || !person.person_data.privileges) return false;

        const isElder = person.person_data.privileges.some(
          (p) => p.privilege === 'elder' && p._deleted === false
        );

        if (isElder) return true;

        return personIsMS(person);
      })
      .map((record) => {
        return {
          person_uid: record.person_uid,
          speaker_data: {
            ...record.speaker_data,
            local: { value: true, updatedAt: '' },
            cong_id: congId,
          },
        } as VisitingSpeakerType;
      });

    return {
      settings,
      persons,
      outgoing_speakers,
      speakers_congregations,
      visiting_speakers,
      user_bible_studies,
      user_field_service_reports,
      cong_field_service_reports,
      field_service_groups,
      branch_cong_analysis,
      branch_field_service_reports,
      sched,
      departments_schedule,
      service_outings,
      exhibitors,
      responsabilidades,
      sources,
      meeting_attendance,
      metadata,
      delegated_field_service_reports,
      upcoming_events,
      limpieza_config,
      evacuacion_config,
      public_talks_override,
      territories,
      territory_zones,
      territory_tags,
      territory_assignments,
      territory_campaigns,
      territory_notices,
      territory_requests,
      territory_settings,
      circuit_overseer_visits,
    };
  });
};

const dbInsertOutgoingTalks = async (
  talks: OutgoingTalkExportScheduleType[]
) => {
  if (!Array.isArray(talks)) return;

  try {
    // get all records with synced data — semanas legadas/incompletas sin
    // weekend_meeting.outgoing_talks ya no revientan esto (se omiten, ya
    // que de todas formas no hay nada que actualizar en ellas)
    const schedules = await appDb.sched.toArray();
    const syncedSchedules = schedules.filter((record) =>
      record.weekend_meeting?.outgoing_talks?.some((talk) => talk.synced)
    );

    const schedulesToUpdate: SchedWeekType[] = [];

    // remove deleted schedules
    for (const schedule of syncedSchedules) {
      const originalCount = schedule.weekend_meeting.outgoing_talks.length;

      schedule.weekend_meeting.outgoing_talks =
        schedule.weekend_meeting.outgoing_talks.filter((localTalk) => {
          if (!localTalk.synced) return true; // keep local manual talks

          // keep synced talk only if it is still present in the incoming talks from the server
          return talks.some((remoteTalk) => remoteTalk.id === localTalk.id);
        });

      if (schedule.weekend_meeting.outgoing_talks.length !== originalCount) {
        schedulesToUpdate.push(schedule);
      }
    }

    // add or update schedule
    for (const talk of talks) {
      const dbSchedule = await appDb.sched.get(talk.weekOf);

      if (dbSchedule?.weekend_meeting) {
        const tmpSched = talk;

        delete tmpSched.recipient;
        delete tmpSched.sender;
        delete tmpSched.weekOf;

        const addSched = tmpSched as OutgoingTalkScheduleType;

        const schedule = structuredClone(dbSchedule);

        if (!Array.isArray(schedule.weekend_meeting.outgoing_talks)) {
          schedule.weekend_meeting.outgoing_talks = [];
        }

        const localSched = schedule.weekend_meeting.outgoing_talks.find(
          (record) => record.id === talk.id
        );

        if (!localSched) {
          schedule.weekend_meeting.outgoing_talks.push(addSched);
        }

        if (localSched) {
          const remoteUpdated = addSched.updatedAt || '';
          const localUpdated = localSched.updatedAt || '';

          if (remoteUpdated > localUpdated) {
            schedule.weekend_meeting.outgoing_talks =
              schedule.weekend_meeting.outgoing_talks.filter(
                (record) => record.id !== talk.id
              );

            schedule.weekend_meeting.outgoing_talks.push(addSched);
          }
        }

        schedulesToUpdate.push(schedule);
      }
    }

    // save to db
    if (schedulesToUpdate.length > 0) {
      await appDb.sched.bulkPut(schedulesToUpdate);
    }
  } catch (error) {
    throw new Error(`outgoing_talks: ${error}`);
  }
};

const convertObjectToArray = (settings: SettingsType) => {
  if (
    settings?.cong_settings?.display_name_enabled &&
    !Array.isArray(settings.cong_settings.display_name_enabled)
  ) {
    const dateA =
      settings.cong_settings.display_name_enabled['meetings']['updatedAt'];

    const dateB =
      settings.cong_settings.display_name_enabled['others']['updatedAt'];

    const meetings =
      settings.cong_settings.display_name_enabled['meetings']['value'];

    const others =
      settings.cong_settings.display_name_enabled['others']['value'];

    settings.cong_settings.display_name_enabled = [
      {
        type: 'main',
        _deleted: false,
        updatedAt: dateA > dateB ? dateA : dateB,
        meetings,
        others,
      },
    ];
  }

  if (
    settings?.cong_settings?.schedule_exact_date_enabled &&
    !Array.isArray(settings.cong_settings.schedule_exact_date_enabled)
  ) {
    const updatedAt =
      settings.cong_settings.schedule_exact_date_enabled['updatedAt'];

    const value = settings.cong_settings.schedule_exact_date_enabled['value'];

    settings.cong_settings.schedule_exact_date_enabled = [
      {
        type: 'main',
        _deleted: false,
        updatedAt,
        value,
      },
    ];
  }

  if (
    settings?.cong_settings?.attendance_online_record &&
    !Array.isArray(settings.cong_settings.attendance_online_record)
  ) {
    const updatedAt =
      settings.cong_settings.attendance_online_record['updatedAt'];

    const value = settings.cong_settings.attendance_online_record['value'];

    settings.cong_settings.attendance_online_record = [
      {
        type: 'main',
        _deleted: false,
        updatedAt,
        value,
      },
    ];
  }

  if (typeof settings?.user_settings?.data_view === 'string') {
    settings.user_settings.data_view = {
      value: settings.user_settings.data_view,
      updatedAt: new Date().toISOString(),
    };
  }

  if (typeof settings?.cong_settings.cong_number === 'string') {
    settings.cong_settings.cong_number = {
      value: settings.cong_settings.cong_number,
      updatedAt: new Date().toISOString(),
    };
  }

  return settings;
};

const dbRestoreSettings = async (
  backupData: BackupDataType,
  accessCode: string,
  masterKey?: string
) => {
  try {
    if (!backupData.app_settings) return;

    const remoteSettings = backupData.app_settings as SettingsType;

    delete remoteSettings.cong_settings.cong_master_key;
    delete remoteSettings.cong_settings.cong_access_code;

    decryptObject({
      data: remoteSettings,
      table: 'app_settings',
      accessCode,
      masterKey,
    });

    const settings = await appDb.app_settings.get(1);

    const localSettings = structuredClone(settings);

    convertObjectToArray(remoteSettings);
    convertObjectToArray(localSettings);

    syncFromRemote(localSettings, remoteSettings);

    if (backupData.metadata.user_settings) {
      localSettings.user_settings.cong_role =
        remoteSettings.user_settings.cong_role;
      localSettings.user_settings.user_local_uid =
        remoteSettings.user_settings.user_local_uid;
      localSettings.user_settings.user_members_delegate =
        remoteSettings.user_settings.user_members_delegate;
    }

    if (
      backupData.metadata.cong_settings &&
      localSettings.user_settings.account_type === 'vip'
    ) {
      // force to use local value
      localSettings.cong_settings.cong_new = settings.cong_settings.cong_new;
      localSettings.cong_settings.cong_migrated =
        settings.cong_settings.cong_migrated ?? false;

      if (localSettings?.cong_settings['source_material_auto_import']) {
        delete localSettings.cong_settings['source_material_auto_import'];
      }

      const midweekSettings =
        localSettings?.cong_settings.midweek_meeting || [];

      for (const midweekSetting of midweekSettings) {
        if (midweekSetting['opening_prayer_auto_assigned']) {
          delete midweekSetting['opening_prayer_auto_assigned'];
        }

        if (midweekSetting['closing_prayer_auto_assigned']) {
          delete midweekSetting['closing_prayer_auto_assigned'];
        }
      }
    }

    if (
      backupData.metadata.cong_settings &&
      localSettings.user_settings.account_type === 'pocket'
    ) {
      for (const [key, value] of Object.entries(remoteSettings.cong_settings)) {
        localSettings.cong_settings[key] = value;
      }
    }

    if (!backupData.metadata.user_settings) {
      delete localSettings.user_settings;
    }

    if (!backupData.metadata.cong_settings) {
      delete localSettings.cong_settings;
    }

    await appDb.app_settings.update(1, localSettings);
  } catch (error) {
    throw new Error(`settings: ${error.message}`);
  }
};

const dbRestorePersons = async (
  backupData: BackupDataType,
  accessCode: string,
  masterKey?: string
) => {
  try {
    if (!backupData.persons) return;

    const remotePersons = (backupData.persons as object[]).map(
      (person: PersonType) => {
        decryptObject({
          data: person,
          table: 'persons',
          accessCode,
          masterKey,
        });

        // remove old key
        delete person.person_data.categories;

        // clean up keys
        if (
          person.person_data.family_members &&
          typeof person.person_data.family_members === 'string'
        ) {
          delete person.person_data.family_members;
        }

        return person;
      }
    );

    remotePersons.forEach((person) => {
      const assignments = person.person_data.assignments;

      if (assignments && assignments.length === 0) {
        person.person_data.assignments.push({
          type: 'main',
          updatedAt: '',
          values: [],
        });
      }

      if (
        assignments &&
        assignments.length > 0 &&
        'code' in assignments.at(0)
      ) {
        const codes: number[] = assignments
          .filter((a) => !a['_deleted'])
          .map((a) => a['code']);

        person.person_data.assignments.length = 0;
        person.person_data.assignments = [
          {
            type: 'main',
            updatedAt: new Date().toISOString(),
            values: codes.filter((code) => code !== undefined),
          },
        ];
      }

      if (assignments) {
        person.person_data.assignments = person.person_data.assignments.filter(
          (record) => 'code' in record === false
        );
      }
    });

    const persons = await appDb.persons.toArray();

    const personToUpdate: PersonType[] = [];

    for (const remotePerson of remotePersons) {
      const localPerson = persons.find(
        (record) => record.person_uid === remotePerson.person_uid
      );

      if (!localPerson) {
        personToUpdate.push(remotePerson);
      }

      if (localPerson) {
        const newPerson = structuredClone(localPerson);
        syncFromRemote(newPerson, remotePerson);

        personToUpdate.push(newPerson);
      }
    }

    if (personToUpdate.length > 0) {
      await appDb.persons.bulkPut(personToUpdate);
    }
  } catch (error) {
    throw new Error(`persons: ${error.message}`);
  }
};

const dbRestoreUpcomingEvents = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.upcoming_events) return;

    const remoteEvents = (
      backupData.upcoming_events as UpcomingEventType[]
    ).map((event: UpcomingEventType) => {
      decryptObject({
        data: event,
        table: 'upcoming_events',
        accessCode,
      });

      // clean up keys
      if (event.updatedAt) {
        event.event_data._deleted = event._deleted;
        event.event_data.updatedAt = event.updatedAt;

        delete event._deleted;
        delete event.updatedAt;
      }

      return event;
    });

    const events = await appDb.upcoming_events.toArray();

    const eventToUpdate: UpcomingEventType[] = [];

    for (const remoteEvent of remoteEvents) {
      const localEvent = events.find(
        (record) => record.event_uid === remoteEvent.event_uid
      );

      if (!localEvent) {
        eventToUpdate.push(remoteEvent);
      }

      if (localEvent) {
        const newEvent = structuredClone(localEvent);
        syncFromRemote(newEvent, remoteEvent);

        eventToUpdate.push(newEvent);
      }
    }

    if (eventToUpdate.length > 0) {
      await appDb.upcoming_events.bulkPut(eventToUpdate);
    }
  } catch (error) {
    throw new Error(`upcoming_events: ${error.message}`);
  }
};

const dbRestoreSpeakersCongregations = async (
  backupData: BackupDataType,
  accessCode: string,
  masterKey?: string
) => {
  try {
    if (!backupData.speakers_congregations) return;

    const remoteCongregations = (
      backupData.speakers_congregations as object[]
    ).map((congregation: SpeakersCongregationsType) => {
      decryptObject({
        data: congregation,
        table: 'speakers_congregations',
        accessCode,
        masterKey,
      });

      return congregation;
    });

    const congregations = await appDb.speakers_congregations.toArray();

    const congsToUpdate: SpeakersCongregationsType[] = [];

    for (const remoteCongregation of remoteCongregations) {
      if (!remoteCongregation || !remoteCongregation.id) continue;
      const localCongregation = congregations.find(
        (record) => record.id === remoteCongregation.id
      );

      if (!localCongregation) {
        congsToUpdate.push(remoteCongregation);
      }

      if (localCongregation) {
        const newCongregation = structuredClone(localCongregation);
        syncFromRemote(newCongregation, remoteCongregation);

        congsToUpdate.push(newCongregation);
      }
    }

    if (congsToUpdate.length > 0) {
      await appDb.speakers_congregations.bulkPut(congsToUpdate);
    }
  } catch (error) {
    throw new Error(`speakers_congregations: ${error.message}`);
  }
};

const dbRestoreVisitingSpeakers = async (
  backupData: BackupDataType,
  accessCode: string,
  masterKey?: string
) => {
  try {
    if (!backupData.visiting_speakers) return [];

    const decryptedSpeakers = (backupData.visiting_speakers as object[]).map(
      (speaker: VisitingSpeakerType) => {
        decryptObject({
          data: speaker,
          table: 'visiting_speakers',
          accessCode,
          masterKey,
        });

        return speaker;
      }
    );

    // La sincronización diaria del circuito (Google Sheets → API → esta
    // restauración) no conoce el person_uid interno de la app y genera el
    // suyo propio para nuestros discursantes salientes. Se reconecta aquí,
    // en cada restauración, con su Persona real por nombre — es el punto de
    // entrada real de esos datos (a diferencia de la importación manual de
    // un backup JSON, que es otro camino distinto y mucho menos frecuente).
    const persons = await appDb.persons.toArray();
    const activePersons = persons.filter((person) => {
      if (person._deleted.value) return false;
      return !(person.person_data.archived?.value ?? false);
    });

    const congregations = await appDb.speakers_congregations.toArray();
    const settings = await appDb.app_settings.get(1);
    const localCongId = resolveLocalCongId(
      congregations,
      settings?.cong_settings.cong_name ?? '',
      settings?.cong_settings.cong_number.value ?? ''
    );

    const { speakers: remoteSpeakers, reconciledUids } =
      reconcileOutgoingSpeakerLinks(decryptedSpeakers, activePersons, localCongId);

    const speakers = await appDb.visiting_speakers.toArray();

    // Si ya existía localmente un registro huérfano bajo el person_uid
    // antiguo (de una sincronización previa a esta reconciliación), se
    // renombra al uid real en vez de dejarlo tal cual — si no, quedarían
    // dos copias del mismo discursante: la huérfana y la recién enlazada.
    const oldUidsToDelete: string[] = [];

    for (const { oldUid, newUid } of reconciledUids) {
      const staleIndex = speakers.findIndex(
        (record) => record.person_uid === oldUid
      );

      if (staleIndex !== -1) {
        speakers[staleIndex] = { ...speakers[staleIndex], person_uid: newUid };
        oldUidsToDelete.push(oldUid);
      }
    }

    const speakersToUpdate: VisitingSpeakerType[] = [];

    for (const remoteSpeaker of remoteSpeakers) {
      if (!remoteSpeaker || !remoteSpeaker.person_uid) continue;
      const localSpeaker = speakers.find(
        (record) => record.person_uid === remoteSpeaker.person_uid
      );

      if (!localSpeaker) {
        speakersToUpdate.push(remoteSpeaker);
      }

      if (localSpeaker) {
        const newSpeaker = structuredClone(localSpeaker);
        syncFromRemote(newSpeaker, remoteSpeaker);

        speakersToUpdate.push(newSpeaker);
      }
    }

    if (speakersToUpdate.length > 0) {
      await appDb.visiting_speakers.bulkPut(speakersToUpdate);
    }

    if (oldUidsToDelete.length > 0) {
      await appDb.visiting_speakers.bulkDelete(oldUidsToDelete);
    }

    return reconciledUids;
  } catch (error) {
    throw new Error(`visiting_speakers: ${error.message}`);
  }
};

const dbRestoreFieldGroups = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.field_service_groups) return;

    const remoteGroups = (backupData.field_service_groups as object[]).map(
      (group: FieldServiceGroupType) => {
        decryptObject({
          data: group,
          table: 'field_service_groups',
          accessCode,
        });

        return group;
      }
    );

    const groups = await appDb.field_service_groups.toArray();

    const groupsToUpdate: FieldServiceGroupType[] = [];

    for (const remoteGroup of remoteGroups) {
      const localGroup = groups.find(
        (record) => record.group_id === remoteGroup.group_id
      );

      if (!localGroup) {
        groupsToUpdate.push(remoteGroup);
      }

      if (localGroup) {
        const newGroup = structuredClone(localGroup);
        syncFromRemote(newGroup, remoteGroup);

        groupsToUpdate.push(newGroup);
      }
    }

    if (groupsToUpdate.length > 0) {
      await appDb.field_service_groups.bulkPut(groupsToUpdate);
    }
  } catch (error) {
    throw new Error(`field_service_groups: ${error.message}`);
  }
};

const dbRestoreUserStudies = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.user_bible_studies) return;

    const remoteData = (backupData.user_bible_studies as object[]).map(
      (data: UserBibleStudyType) => {
        decryptObject({
          data,
          table: 'user_bible_studies',
          accessCode,
        });

        return data;
      }
    );

    const localData = await appDb.user_bible_studies.toArray();

    const dataToUpdate: UserBibleStudyType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(
        (record) => record.person_uid === remoteItem.person_uid
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.user_bible_studies.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`user_bible_studies: ${error.message}`);
  }
};

const dbRestoreUserReports = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.user_field_service_reports) return;

    const remoteData = (
      backupData.user_field_service_reports as UserFieldServiceReportType[]
    ).map((data) => {
      decryptObject({
        data,
        table: 'user_field_service_reports',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.user_field_service_reports.toArray();

    const dataToUpdate: UserFieldServiceReportType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(
        (record) => record.report_date === remoteItem.report_date
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.user_field_service_reports.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`user_field_service_reports: ${error.message}`);
  }
};

const dbRestoreCongReports = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.cong_field_service_reports) return;

    const settings = await appDb.app_settings.get(1);

    const userRole = settings.user_settings.cong_role;

    const secretaryRole = userRole.includes('secretary');
    const coordinatorRole = userRole.includes('coordinator');
    const adminRole =
      userRole.includes('admin') || secretaryRole || coordinatorRole;
    const publisherRole = userRole.includes('publisher');

    const allowRestore = adminRole || publisherRole;

    if (allowRestore) {
      const remoteData = (
        backupData.cong_field_service_reports as CongFieldServiceReportType[]
      ).map((data) => {
        decryptObject({
          data,
          table: 'cong_field_service_reports',
          accessCode,
        });

        return data;
      });

      const localData = await appDb.cong_field_service_reports.toArray();

      const dataToUpdate: CongFieldServiceReportType[] = [];

      for (const remoteItem of remoteData) {
        const localItem = localData.find(
          (record) => record.report_id === remoteItem.report_id
        );

        if (!localItem) {
          dataToUpdate.push(remoteItem);
        }

        if (localItem) {
          const newItem = structuredClone(localItem);
          syncFromRemote(newItem, remoteItem);

          dataToUpdate.push(newItem);
        }
      }

      if (dataToUpdate.length > 0) {
        await appDb.cong_field_service_reports.bulkPut(dataToUpdate);
      }
    }
  } catch (error) {
    throw new Error(`cong_field_service_reports: ${error.message}`);
  }
};

const dbRestoreBranchReports = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.branch_field_service_reports) return;

    const remoteData = (
      backupData.branch_field_service_reports as BranchFieldServiceReportType[]
    ).map((data) => {
      decryptObject({
        data,
        table: 'branch_field_service_reports',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.branch_field_service_reports.toArray();

    const dataToUpdate: BranchFieldServiceReportType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(
        (record) => record.report_date === remoteItem.report_date
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.branch_field_service_reports.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`branch_field_service_reports: ${error.message}`);
  }
};

const dbRestoreBranchCongAnalysis = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.branch_cong_analysis) return;

    const remoteData = (
      backupData.branch_cong_analysis as BranchCongAnalysisType[]
    ).map((data) => {
      decryptObject({
        data,
        table: 'branch_cong_analysis',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.branch_cong_analysis.toArray();

    const dataToUpdate: BranchCongAnalysisType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(
        (record) => record.report_date === remoteItem.report_date
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.branch_cong_analysis.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`branch_cong_analysis: ${error.message}`);
  }
};

const dbRestoreMeetingAttendance = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.meeting_attendance) return;

    const remoteData = (
      backupData.meeting_attendance as MeetingAttendanceType[]
    ).map((data) => {
      decryptObject({
        data,
        table: 'meeting_attendance',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.meeting_attendance.toArray();

    const dataToUpdate: MeetingAttendanceType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(
        (record) => record.month_date === remoteItem.month_date
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.meeting_attendance.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`meeting_attendance: ${error.message}`);
  }
};

const dbRestoreSources = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.sources) return;

    const remoteData = (backupData.sources as SourceWeekType[]).map((data) => {
      decryptObject({
        data,
        table: 'sources',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.sources.toArray();

    const validRemoteData = remoteData.filter((record) =>
      isMondayDate(record.weekOf)
    );

    // Algunas semanas (legadas/incompletas) llegan sin midweek_meeting o
    // weekend_meeting del todo — antes esto reventaba toda la transacción de
    // restauración (incluyendo programas, departamentos, exhibidores, etc.)
    // para CUALQUIER usuario que recibiera esa semana, no solo la afectada.
    validRemoteData.forEach((source) => {
      const midweekEvent = source.midweek_meeting?.event_name;

      if (typeof midweekEvent === 'object' && !Array.isArray(midweekEvent)) {
        source.midweek_meeting.event_name = [
          {
            type: 'main',
            value: midweekEvent['value'],
            updatedAt: midweekEvent['updatedAt'],
          },
        ];
      }

      const weekendEvent = source.weekend_meeting?.event_name;

      if (typeof weekendEvent === 'object' && !Array.isArray(weekendEvent)) {
        source.weekend_meeting.event_name = [
          {
            type: 'main',
            value: weekendEvent['value'],
            updatedAt: weekendEvent['updatedAt'],
          },
        ];
      }
    });

    const dataToUpdate: SourceWeekType[] = [];

    for (const remoteItem of validRemoteData) {
      const localItem = localData.find(
        (record) => record.weekOf === remoteItem.weekOf
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);

        if (!Array.isArray(newItem.midweek_meeting?.event_name)) {
          delete newItem.midweek_meeting?.event_name;
        }

        if (!Array.isArray(newItem.weekend_meeting?.event_name)) {
          delete newItem.weekend_meeting?.event_name;
        }

        syncFromRemote(newItem, remoteItem);
        dataToUpdate.push(newItem);
      }
    }

    const invalidLocalData = localData.filter(
      (record) => !isMondayDate(record.weekOf)
    );

    if (invalidLocalData.length > 0) {
      const weeks = invalidLocalData.map((record) => record.weekOf);
      await appDb.sources.bulkDelete(weeks);
    }

    if (dataToUpdate.length > 0) {
      await appDb.sources.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`sources: ${error.message}`);
  }
};

const dbRestoreDepartmentsSchedule = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.departments_schedule) return;

    const remoteData = (backupData.departments_schedule as DeptWeekType[]).map((data) => {
      decryptObject({
        data,
        table: 'departments_schedule',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.departments_schedule.toArray();

    const validRemoteData = remoteData.filter((record) =>
      isMondayDate(record.weekOf)
    );

    const dataToUpdate: DeptWeekType[] = [];

    for (const remoteItem of validRemoteData) {
      const localItem = localData.find(
        (record) => record.weekOf === remoteItem.weekOf
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      } else {
        const remoteUpdated = remoteItem.updatedAt || '';
        const localUpdated = localItem.updatedAt || '';

        if (remoteUpdated > localUpdated) {
          const newItem = structuredClone(localItem);
          syncFromRemote(newItem, remoteItem);
          dataToUpdate.push(newItem);
        }
      }
    }

    const invalidLocalData = localData.filter(
      (record) => !isMondayDate(record.weekOf)
    );

    if (invalidLocalData.length > 0) {
      const weeks = invalidLocalData.map((record) => record.weekOf);
      await appDb.departments_schedule.bulkDelete(weeks);
    }

    if (dataToUpdate.length > 0) {
      await appDb.departments_schedule.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`departments_schedule: ${error.message}`);
  }
};

const dbRestoreServiceOutings = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.service_outings) return;

    const remoteData = (backupData.service_outings as ServiceOutingWeekType[]).map((data) => {
      decryptObject({
        data,
        table: 'service_outings',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.service_outings.toArray();
    const validRemoteData = remoteData.filter((record) =>
      isMondayDate(record.weekOf) || record.weekOf === 'settings'
    );

    const dataToUpdate: ServiceOutingWeekType[] = [];

    for (const remoteItem of validRemoteData) {
      const localItem = localData.find(
        (record) => record.weekOf === remoteItem.weekOf
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      } else {
        const remoteUpdated = remoteItem.updatedAt || '';
        const localUpdated = localItem.updatedAt || '';

        if (remoteUpdated > localUpdated) {
          // El registro 'settings' guarda availability como un mapa plano
          // {person_uid: string[]} — syncFromRemote empareja arrays por
          // 'id'/'type'/'talk_number', y un array de strings no tiene
          // ninguno de esos, así que un cambio de disponibilidad de un
          // publicador se descartaba en silencio si el mapa ya existía
          // localmente. El registro 'settings' comparte un solo updatedAt
          // para todo, así que no hace falta fusionar campo por campo: si el
          // remoto es más nuevo, gana entero (igual que en exhibitors).
          if (remoteItem.weekOf === 'settings') {
            dataToUpdate.push(remoteItem);
          } else {
            const newItem = structuredClone(localItem);
            syncFromRemote(newItem, remoteItem);
            dataToUpdate.push(newItem);
          }
        }
      }
    }

    const invalidLocalData = localData.filter(
      (record) => !isMondayDate(record.weekOf) && record.weekOf !== 'settings'
    );

    if (invalidLocalData.length > 0) {
      const weeks = invalidLocalData.map((record) => record.weekOf);
      await appDb.service_outings.bulkDelete(weeks);
    }

    if (dataToUpdate.length > 0) {
      await appDb.service_outings.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`service_outings: ${error.message}`);
  }
};

const dbRestoreExhibitors = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.exhibitors) return;

    const remoteData = (backupData.exhibitors as ExhibitorWeekType[]).map((data) => {
      decryptObject({
        data,
        table: 'exhibitors',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.exhibitors.toArray();
    const validRemoteData = remoteData.filter((record) =>
      isMondayDate(record.weekOf) || record.weekOf === 'settings'
    );

    const dataToUpdate: ExhibitorWeekType[] = [];

    for (const remoteItem of validRemoteData) {
      const localItem = localData.find(
        (record) => record.weekOf === remoteItem.weekOf
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      } else {
        const remoteUpdated = remoteItem.updatedAt || '';
        const localUpdated = localItem.updatedAt || '';

        // syncFromRemote fusiona arrays emparejando por 'id'/'type'/
        // 'talk_number' — pero ExhibitorWeekTurnType usa turnId+date, así
        // que nunca encontraba coincidencia y descartaba en silencio los
        // turnos nuevos/editados del remoto (mientras igual actualizaba
        // updatedAt, aparentando que sí se sincronizó). Como todo el
        // registro de la semana comparte un solo updatedAt, no hace falta
        // fusionar campo por campo: si el remoto es más nuevo, gana entero.
        if (remoteUpdated > localUpdated) {
          dataToUpdate.push(remoteItem);
        }
      }
    }

    const invalidLocalData = localData.filter(
      (record) => !isMondayDate(record.weekOf) && record.weekOf !== 'settings'
    );

    if (invalidLocalData.length > 0) {
      const weeks = invalidLocalData.map((record) => record.weekOf);
      await appDb.exhibitors.bulkDelete(weeks);
    }

    if (dataToUpdate.length > 0) {
      await appDb.exhibitors.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`exhibitors: ${error.message}`);
  }
};

const dbRestoreSchedules = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.sched) return;

    const remoteData = (backupData.sched as SchedWeekType[]).map((data) => {
      decryptObject({
        data,
        table: 'sched',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.sched.toArray();

    const validRemoteData = remoteData.filter((record) =>
      isMondayDate(record.weekOf)
    );

    const dataToUpdate: SchedWeekType[] = [];

    for (const remoteItem of validRemoteData) {
      const localItem = localData.find(
        (record) => record.weekOf === remoteItem.weekOf
      );

      if (typeof remoteItem.midweek_meeting?.aux_fsg === 'string') {
        delete remoteItem.midweek_meeting.aux_fsg;
      }

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        // Semanas legadas/incompletas pueden no tener midweek_meeting del
        // todo — sin esta guarda, una sola semana así reventaba la
        // transacción completa de restauración para todo el que la recibiera.
        const midweek = newItem.midweek_meeting;
        const localMidweek = localItem.midweek_meeting;

        if (midweek && localMidweek) {
          if (Array.isArray(midweek.chairman?.aux_class_1)) {
            midweek.chairman.aux_class_1 = localMidweek.chairman.aux_class_1;
          }

          if (Array.isArray(midweek.tgw_bible_reading?.aux_class_1)) {
            midweek.tgw_bible_reading.aux_class_1 =
              localMidweek.tgw_bible_reading.aux_class_1;
          }

          if (Array.isArray(midweek.tgw_bible_reading?.aux_class_2)) {
            midweek.tgw_bible_reading.aux_class_2 =
              localMidweek.tgw_bible_reading.aux_class_2;
          }

          if (Array.isArray(midweek.ayf_part1?.aux_class_1)) {
            midweek.ayf_part1.aux_class_1 = localMidweek.ayf_part1.aux_class_1;
          }

          if (Array.isArray(midweek.ayf_part1?.aux_class_2)) {
            midweek.ayf_part1.aux_class_2 = localMidweek.ayf_part1.aux_class_2;
          }

          if (Array.isArray(midweek.ayf_part2?.aux_class_1)) {
            midweek.ayf_part2.aux_class_1 = localMidweek.ayf_part2.aux_class_1;
          }

          if (Array.isArray(midweek.ayf_part2?.aux_class_2)) {
            midweek.ayf_part2.aux_class_2 = localMidweek.ayf_part2.aux_class_2;
          }

          if (Array.isArray(midweek.ayf_part3?.aux_class_1)) {
            midweek.ayf_part3.aux_class_1 = localMidweek.ayf_part3.aux_class_1;
          }

          if (Array.isArray(midweek.ayf_part3?.aux_class_2)) {
            midweek.ayf_part3.aux_class_2 = localMidweek.ayf_part3.aux_class_2;
          }

          if (Array.isArray(midweek.ayf_part4?.aux_class_1)) {
            midweek.ayf_part4.aux_class_1 = localMidweek.ayf_part4.aux_class_1;
          }

          if (Array.isArray(midweek.ayf_part4?.aux_class_2)) {
            midweek.ayf_part4.aux_class_2 = localMidweek.ayf_part4.aux_class_2;
          }
        }

        dataToUpdate.push(newItem);
      }
    }

    const invalidLocalData = localData.filter(
      (record) => !isMondayDate(record.weekOf)
    );

    if (invalidLocalData.length > 0) {
      const weeks = invalidLocalData.map((record) => record.weekOf);
      await appDb.sched.bulkDelete(weeks);
    }

    if (dataToUpdate.length > 0) {
      await appDb.sched.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`schedules: ${error.message}`);
  }
};

const dbRestoreDelegatedReports = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.delegated_field_service_reports) return;

    const remoteData = (
      backupData.delegated_field_service_reports as DelegatedFieldServiceReportType[]
    ).map((data) => {
      decryptObject({
        data,
        table: 'delegated_field_service_reports',
        accessCode,
      });

      return data;
    });

    const localData = await appDb.delegated_field_service_reports.toArray();

    const dataToUpdate: DelegatedFieldServiceReportType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find(
        (record) =>
          record.report_data.report_date ===
            remoteItem.report_data.report_date &&
          record.report_data.person_uid === remoteItem.report_data.person_uid
      );

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      }

      if (localItem) {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);

        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.delegated_field_service_reports.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`delegated_field_service_reports: ${error.message}`);
  }
};

const dbRestoreCircuitVisits = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.circuit_overseer_visits) return;

    const remoteData = (
      backupData.circuit_overseer_visits as CircuitVisitType[]
    ).map((data) => {
      decryptObject({ data, table: 'circuit_overseer_visits', accessCode });
      return data;
    });

    const localData = await appDb.circuit_overseer_visits.toArray();
    const dataToUpdate: CircuitVisitType[] = [];

    for (const remoteItem of remoteData) {
      const localItem = localData.find((record) => record.id === remoteItem.id);

      if (!localItem) {
        dataToUpdate.push(remoteItem);
      } else {
        const newItem = structuredClone(localItem);
        syncFromRemote(newItem, remoteItem);
        dataToUpdate.push(newItem);
      }
    }

    if (dataToUpdate.length > 0) {
      await appDb.circuit_overseer_visits.bulkPut(dataToUpdate);
    }
  } catch (error) {
    throw new Error(`circuit_overseer_visits: ${error.message}`);
  }
};

const dbInsertMetadata = async (metadata: Record<string, string>) => {
  const oldMetadata = await appDb.metadata.get(1);

  const result = oldMetadata?.metadata || {};

  for (const [key, value] of Object.entries(metadata)) {
    result[key] = {
      version: value,
      send_local: result[key]?.send_local || false,
    };
  }

  const toSave = { id: oldMetadata?.id || 1, metadata: result };

  await appDb.metadata.put(toSave);
};

const getObjectLatestUpdate = (obj: unknown) => {
  let latest = '';

  const traverse = (current: unknown) => {
    if (!current || typeof current !== 'object') return;
    const record = current as Record<string, unknown>;
    for (const key in record) {
      const val = record[key];
      if (key === 'updatedAt' && typeof val === 'string') {
        if (val > latest) {
          latest = val;
        }
      } else if (val !== null && typeof val === 'object') {
        traverse(val);
      }
    }
  };

  traverse(obj);
  return latest;
};

const dbDeduplicateSpeakers = async () => {
  const speakers = await appDb.visiting_speakers.toArray();
  const allCongregations = await appDb.speakers_congregations.toArray();
  // Un discursante con un cong_id que no apunta a ninguna congregación real
  // (huérfano — la causa típica: una sync externa que generó un cong_id
  // nuevo en vez de reusar el existente) no debe tratarse como un grupo
  // aparte solo porque su cong_id es distinto. Por eso ya no se agrupa por
  // nombre+cong_id, sino por nombre, y luego se decide cómo fusionar según
  // cuántos cong_id válidos distintos aparecen en el grupo (ver abajo).
  const validCongIds = new Set(
    allCongregations
      .filter(
        (cong) =>
          cong._deleted &&
          typeof cong._deleted === 'object' &&
          cong._deleted.value === false
      )
      .map((cong) => cong.id)
  );

  // Un mismo orador puede quedar duplicado con nombres que NO calzan
  // carácter por carácter — el Sheet trae el nombre legal completo
  // ("Carlos Saca Miranda") mientras la app guarda uno abreviado para
  // mostrar ("Carlos Saca M."). Agrupar por la cadena completa normalizada
  // no detectaba estos pares como duplicados; ahora se agrupa por la
  // primera palabra del nombre y la primera palabra del apellido (el
  // paterno) — mismo criterio que matchSpeakerToPerson.
  const groupKey = (firstNameVal: string, lastNameVal: string) => {
    const firstTokens = tokenize(firstNameVal);
    const lastTokens = tokenize(lastNameVal);
    if (firstTokens.length === 0 || lastTokens.length === 0) return null;
    return `${firstTokens[0]}|${lastTokens[0]}`;
  };

  // Necesario para dos cosas más abajo: (1) nunca fusionar a ciegas dos
  // registros que ya están enlazados a dos Personas reales distintas, y
  // (2) preferir como sobreviviente al que sí tiene un enlace real.
  const persons = await appDb.persons.toArray();
  const activePersonUids = new Set(
    persons
      .filter((person) => {
        if (person._deleted.value) return false;
        return !(person.person_data.archived?.value ?? false);
      })
      .map((person) => person.person_uid)
  );

  const groups = new Map<string, VisitingSpeakerType[]>();

  for (const speaker of speakers) {
    if (!speaker._deleted || typeof speaker._deleted !== 'object' || speaker._deleted.value === undefined) {
      continue;
    }
    if (speaker._deleted.value) continue;

    if (!speaker.speaker_data || typeof speaker.speaker_data !== 'object') {
      continue;
    }

    const firstNameVal = speaker.speaker_data.person_firstname?.value || '';
    const lastNameVal = speaker.speaker_data.person_lastname?.value || '';

    const key = groupKey(firstNameVal, lastNameVal);
    if (!key) continue;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(speaker);
  }

  const speakersToUpdate: VisitingSpeakerType[] = [];
  const dedupedUids: { oldUid: string; newUid: string }[] = [];

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const distinctValidCongIds = new Set(
      group
        .map((speaker) => speaker.speaker_data.cong_id)
        .filter((congId) => validCongIds.has(congId))
    );

    // 2+ cong_id válidos y distintos: probablemente son personas reales
    // distintas que comparten nombre en congregaciones distintas, no
    // duplicados — no se fusionan a ciegas para no mezclar a dos hermanos.
    if (distinctValidCongIds.size > 1) continue;

    // 2+ personas reales y activas distintas ya enlazadas dentro del mismo
    // grupo: agrupar solo por la primera palabra de nombre y apellido es
    // más permisivo que una coincidencia exacta, así que puede juntar a dos
    // hermanos de verdad distintos (p. ej. "Carlos Saca M." y "Carlos Saca
    // Jr.", cada uno ya enlazado a su propia Persona) — nunca se fusionan a
    // ciegas en ese caso.
    const distinctLinkedPersonUids = new Set(
      group
        .map((speaker) => speaker.person_uid)
        .filter((uid) => activePersonUids.has(uid))
    );
    if (distinctLinkedPersonUids.size > 1) continue;

    group.sort((a, b) => {
      // El que ya está enlazado a una Persona real va primero — preservar
      // ese enlace es más importante que la fecha, porque si se pierde no
      // se recupera solo (bug real confirmado: la reconciliación no vuelve
      // a tocar un registro huérfano recién fusionado con el enlace bueno).
      const aLinked = activePersonUids.has(a.person_uid) ? 1 : 0;
      const bLinked = activePersonUids.has(b.person_uid) ? 1 : 0;
      if (aLinked !== bLinked) return bLinked - aLinked;

      // El que tiene un cong_id que sí resuelve a una congregación real va
      // primero — preferirlo como sobreviviente es lo que corrige el caso
      // reportado (una copia sin congregación visible, las demás con ella).
      const aValid = validCongIds.has(a.speaker_data.cong_id) ? 1 : 0;
      const bValid = validCongIds.has(b.speaker_data.cong_id) ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;

      const dateA = getObjectLatestUpdate(a);
      const dateB = getObjectLatestUpdate(b);
      return dateB.localeCompare(dateA);
    });

    // El sobreviviente es el enlazado a la Persona real (si lo hay), pero
    // sus bosquejos (talks) no necesariamente son el conjunto completo — la
    // sync con el catálogo externo de oradores a veces crea un duplicado en
    // vez de añadir un bosquejo nuevo al existente, y cada copia termina
    // con bosquejos distintos. Antes esto se descartaba sin más al borrar
    // el duplicado; ahora se fusionan los bosquejos de todas las copias en
    // el sobreviviente antes de borrar el resto.
    const survivor = group[0];
    const mergedTalks = new Map(
      survivor.speaker_data.talks.map((talk) => [talk.talk_number, talk])
    );

    for (let i = 1; i < group.length; i++) {
      for (const talk of group[i].speaker_data.talks) {
        const existing = mergedTalks.get(talk.talk_number);

        if (!existing) {
          mergedTalks.set(talk.talk_number, talk);
          continue;
        }

        // El Sheet del circuito nunca aporta canciones — tomar "el más
        // reciente" a ciegas podría borrar talk_songs ya puestas a mano si
        // el duplicado más reciente viene sin ellas.
        const winner = talk.updatedAt > existing.updatedAt ? talk : existing;
        const talk_songs =
          existing.talk_songs.length > 0 ? existing.talk_songs : talk.talk_songs;

        mergedTalks.set(talk.talk_number, { ...winner, talk_songs });
      }
    }

    survivor.speaker_data.talks = Array.from(mergedTalks.values());

    // El nombre denormalizado del sobreviviente se actualiza al del
    // duplicado cuyo nombre se tocó más recientemente (normalmente el que
    // acaba de traer el sync del Sheet) — si el sobreviviente se queda con
    // la forma abreviada de la app mientras el Sheet sigue mandando la
    // forma completa, el próximo sync no lo reconoce y vuelve a duplicarlo
    // (bug real confirmado 2026-07-06: el mismo ciclo se repetía cada día).
    const nameDonor = group.reduce((freshest, speaker) => {
      const speakerNameUpdatedAt =
        speaker.speaker_data.person_lastname?.updatedAt ?? '';
      const freshestNameUpdatedAt =
        freshest.speaker_data.person_lastname?.updatedAt ?? '';
      return speakerNameUpdatedAt > freshestNameUpdatedAt ? speaker : freshest;
    }, group[0]);

    if (nameDonor !== survivor) {
      survivor.speaker_data.person_firstname = nameDonor.speaker_data.person_firstname;
      survivor.speaker_data.person_lastname = nameDonor.speaker_data.person_lastname;
    }

    speakersToUpdate.push(survivor);

    for (let i = 1; i < group.length; i++) {
      const speaker = group[i];
      // Los programas que ya tenían asignado a este duplicado en Discursos
      // salientes deben reapuntar al sobreviviente — si no, la asignación
      // queda huérfana en cuanto el duplicado se marca borrado.
      dedupedUids.push({ oldUid: speaker.person_uid, newUid: survivor.person_uid });

      speaker._deleted = { value: true, updatedAt: new Date().toISOString() };
      speakersToUpdate.push(speaker);
    }
  }

  if (speakersToUpdate.length > 0) {
    await appDb.visiting_speakers.bulkPut(speakersToUpdate);

    const metadata = await appDb.metadata.get(1);
    if (metadata) {
      metadata.metadata.visiting_speakers = {
        ...metadata.metadata.visiting_speakers,
        send_local: true,
      };
      await appDb.metadata.put(metadata);
    }
  }

  return dedupedUids;
};

const dbDeduplicateCongregations = async () => {
  const congregations = await appDb.speakers_congregations.toArray();
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const groups = new Map<string, SpeakersCongregationsType[]>();

  for (const cong of congregations) {
    if (!cong._deleted || typeof cong._deleted !== 'object' || cong._deleted.value === undefined) {
      continue;
    }
    if (cong._deleted.value) continue;

    if (!cong.cong_data || typeof cong.cong_data !== 'object') {
      continue;
    }

    const nameVal = cong.cong_data.cong_name?.value || '';
    const numberVal = cong.cong_data.cong_number?.value || '';

    const name = normalize(nameVal);
    const number = normalize(numberVal);
    const key = `${name}|${number}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(cong);
  }

  const congsToUpdate: SpeakersCongregationsType[] = [];
  // Cong duplicada (id) -> id de la que sobrevive, para reapuntar a los
  // discursantes que referenciaban la duplicada antes de borrarla.
  const congIdRemap = new Map<string, string>();

  for (const group of groups.values()) {
    if (group.length > 1) {
      group.sort((a, b) => {
        const dateA = getObjectLatestUpdate(a);
        const dateB = getObjectLatestUpdate(b);
        return dateB.localeCompare(dateA);
      });

      const survivorId = group[0].id;

      for (let i = 1; i < group.length; i++) {
        const cong = group[i];
        cong._deleted = { value: true, updatedAt: new Date().toISOString() };
        congsToUpdate.push(cong);
        congIdRemap.set(cong.id, survivorId);
      }
    }
  }

  if (congsToUpdate.length > 0) {
    await appDb.speakers_congregations.bulkPut(congsToUpdate);

    const metadata = await appDb.metadata.get(1);
    if (metadata) {
      metadata.metadata.speakers_congregations = {
        ...metadata.metadata.speakers_congregations,
        send_local: true,
      };
      await appDb.metadata.put(metadata);
    }
  }

  // Sin esto, un discursante que apuntaba a la congregación duplicada
  // (ahora borrada) queda con un cong_id huérfano para siempre: nunca
  // calza con su gemelo real en dbDeduplicateSpeakers, porque la clave de
  // agrupación incluye cong_id y ahora difieren.
  if (congIdRemap.size > 0) {
    const speakers = await appDb.visiting_speakers.toArray();
    const speakersToRemap = speakers.filter((speaker) =>
      congIdRemap.has(speaker.speaker_data?.cong_id)
    );

    if (speakersToRemap.length > 0) {
      for (const speaker of speakersToRemap) {
        speaker.speaker_data.cong_id = congIdRemap.get(
          speaker.speaker_data.cong_id
        );
      }
      await appDb.visiting_speakers.bulkPut(speakersToRemap);
    }
  }
};

const dbRestoreResponsabilidades = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.responsabilidades) return;

    const remoteRecord = structuredClone(backupData.responsabilidades) as ResponsabilidadesType;

    decryptObject({
      data: remoteRecord,
      table: 'responsabilidades',
      accessCode,
    });

    const localRecord = await appDb.responsabilidades.get('main');
    const remoteUpdated = remoteRecord.updatedAt || '';
    const localUpdated = localRecord?.updatedAt || '';

    if (!localRecord || remoteUpdated > localUpdated) {
      await appDb.responsabilidades.put({ ...remoteRecord, id: 'main' });
    }
  } catch (error) {
    throw new Error(`responsabilidades: ${error.message}`);
  }
};

const dbRestoreLimpiezaConfig = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.limpieza_config) return;

    const remoteRecord = structuredClone(backupData.limpieza_config) as Record<string, unknown>;

    decryptObject({
      data: remoteRecord,
      table: 'limpieza_config',
      accessCode,
    });

    const localRecord = await appDb.limpieza_config.get('1');
    const remoteUpdated = remoteRecord.updatedAt || '';
    const localUpdated = localRecord?.updatedAt || '';

    if (!localRecord || remoteUpdated > localUpdated) {
      await appDb.limpieza_config.put({ ...remoteRecord, id: '1' } as unknown as LimpiezaConfig);
    }
  } catch (error) {
    throw new Error(`limpieza_config: ${error.message}`);
  }
};

const dbRestoreEvacuacionConfig = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.evacuacion_config) return;

    const remoteRecord = structuredClone(backupData.evacuacion_config) as Record<string, unknown>;

    decryptObject({
      data: remoteRecord,
      table: 'evacuacion_config',
      accessCode,
    });

    const localRecord = await appDb.evacuacion_config.get('1');
    const remoteUpdated = remoteRecord.updatedAt || '';
    const localUpdated = localRecord?.updatedAt || '';

    if (!localRecord || remoteUpdated > localUpdated) {
      await appDb.evacuacion_config.put({ ...remoteRecord, id: '1' } as unknown as PlanEvacuacion);
    }
  } catch (error) {
    throw new Error(`evacuacion_config: ${error.message}`);
  }
};

const dbRestorePublicTalksOverride = async (
  backupData: BackupDataType,
  accessCode: string
) => {
  try {
    if (!backupData.public_talks_override) return;

    const remoteRecord = structuredClone(
      backupData.public_talks_override
    ) as Record<string, unknown>;

    decryptObject({
      data: remoteRecord,
      table: 'public_talks_override',
      accessCode,
    });

    const localRecord = await appDb.public_talks_override.get('1');
    const remoteUpdated = (remoteRecord.updatedAt as string) || '';
    const localUpdated = localRecord?.updatedAt || '';

    if (!localRecord || remoteUpdated > localUpdated) {
      const newOverride = {
        ...remoteRecord,
        id: '1',
      } as unknown as PublicTalkOverrideType;

      await appDb.public_talks_override.put(newOverride);

      // No se usa dbPublicTalkUpdate() aquí — ese reconstruye desde
      // getI18n(), que no existe en este Web Worker. Se aplica el override
      // directamente sobre lo que ya hay en `public_talks`, sin tocar i18n.
      const talks = await appDb.public_talks.toArray();
      applyPublicTalksOverride(talks, newOverride);
      await appDb.public_talks.bulkPut(talks);
    }
  } catch (error) {
    throw new Error(`public_talks_override: ${error.message}`);
  }
};

// Un registro legado/malformado en CUALQUIER categoría (ya nos pasó con
// sources, sched y exhibitors) reventaba toda la transacción — incluyendo
// dbInsertMetadata al final. Como ese insert nunca llegaba a correr, la
// versión local de TODAS las categorías se quedaba congelada para siempre,
// así que cada sync posterior volvía a mandar metadata vieja y el servidor
// la rechazaba con error_api_sync-conflict en un bucle sin salida — aunque
// el conflicto reportado fuera por una categoría sin relación con la que
// realmente tenía el dato malo.
//
// Cada una de estas categorías es independiente (tabla propia, sin
// dependencias cruzadas), así que un fallo aislado se registra y se omite
// en vez de tirar abajo el resto — el resto de categorías y el avance de
// versión siguen su curso con normalidad.
const restoreCategorySafely = async (
  name: string,
  fn: () => Promise<void>,
  failedCategories: Set<string>
) => {
  try {
    await fn();
  } catch (error) {
    console.error(`[backup] restore "${name}" falló, se omite esta categoría:`, error);
    failedCategories.add(name);
  }
};

const dbRestoreFromBackup = async (
  backupData: BackupDataType,
  accessCode: string,
  masterKey?: string
) => {
  try {
    await appDb.transaction('rw', appDb.tables, async () => {
      await dbRestoreSettings(backupData, accessCode, masterKey);

      await dbRestorePersons(backupData, accessCode, masterKey);

      await dbRestoreSpeakersCongregations(backupData, accessCode, masterKey);

      const reconciledFromRestore = await dbRestoreVisitingSpeakers(backupData, accessCode, masterKey);

      // Las congregaciones se desduplican (y los discursantes huérfanos se
      // reapuntan) ANTES de desduplicar discursantes — si no, un discursante
      // que apuntaba a una congregación duplicada nunca calza con su gemelo
      // real, porque sus cong_id siguen siendo distintos.
      await dbDeduplicateCongregations();

      const reconciledFromDedup = await dbDeduplicateSpeakers();
      const allReconciledUids = [...(reconciledFromRestore ?? []), ...(reconciledFromDedup ?? [])];

      const failedCategories = new Set<string>();
      const safe = (name: string, fn: () => Promise<void>) =>
        restoreCategorySafely(name, fn, failedCategories);

      await safe('field_service_groups', () => dbRestoreFieldGroups(backupData, accessCode));

      await safe('cong_field_service_reports', () => dbRestoreCongReports(backupData, accessCode));

      await safe('branch_field_service_reports', () => dbRestoreBranchReports(backupData, accessCode));

      await safe('branch_cong_analysis', () => dbRestoreBranchCongAnalysis(backupData, accessCode));

      await safe('meeting_attendance', () => dbRestoreMeetingAttendance(backupData, accessCode));

      await safe('sources', () => dbRestoreSources(backupData, accessCode));

      await safe('schedules', () => dbRestoreSchedules(backupData, accessCode));

      // Se reapuntan las asignaciones de Discursos salientes DESPUÉS de
      // fusionar los programas remotos de este ciclo — si se hiciera antes,
      // un merge remoto posterior (de otro dispositivo, con el uid viejo
      // todavía sin reconciliar) podría deshacer el reapunte.
      if (allReconciledUids.length > 0) {
        const schedules = await appDb.sched.toArray();
        const changedSchedules = remapOutgoingTalkAssignments(schedules, allReconciledUids);

        if (changedSchedules.length > 0) {
          await appDb.sched.bulkPut(changedSchedules);
        }
      }

      await safe('departments_schedule', () => dbRestoreDepartmentsSchedule(backupData, accessCode));

      await safe('service_outings', () => dbRestoreServiceOutings(backupData, accessCode));
      await safe('exhibitors', () => dbRestoreExhibitors(backupData, accessCode));
      await safe('responsabilidades', () => dbRestoreResponsabilidades(backupData, accessCode));
      await safe('limpieza_config', () => dbRestoreLimpiezaConfig(backupData, accessCode));
      await safe('evacuacion_config', () => dbRestoreEvacuacionConfig(backupData, accessCode));
      await safe('public_talks_override', () => dbRestorePublicTalksOverride(backupData, accessCode));

      await safe('circuit_overseer_visits', () => dbRestoreCircuitVisits(backupData, accessCode));

      await safe('user_bible_studies', () => dbRestoreUserStudies(backupData, accessCode));

      await safe('upcoming_events', () => dbRestoreUpcomingEvents(backupData, accessCode));

      await safe('user_field_service_reports', () => dbRestoreUserReports(backupData, accessCode));

      await safe('delegated_field_service_reports', () => dbRestoreDelegatedReports(backupData, accessCode));

      await safe('outgoing_talks', async () => {
        if (backupData.outgoing_talks) {
          await dbInsertOutgoingTalks(backupData.outgoing_talks);
        }
      });

      await safe('public_schedules', async () => {
        if (backupData.public_schedules) {
          await appDb.sched.clear();
          const data = backupData.public_schedules as SchedWeekType[];
          await appDb.sched.bulkPut(data);
        }
      });

      await safe('public_sources', async () => {
        if (backupData.public_sources) {
          await appDb.sources.clear();
          const data = backupData.public_sources as SourceWeekType[];
          await appDb.sources.bulkPut(data);
        }
      });

      // Si alguna categoría falló, no avanzamos SU versión local — así el
      // próximo sync la vuelve a pedir y a intentar, en vez de marcarla como
      // sincronizada cuando en realidad se quedó con datos viejos. El resto
      // de categorías (y con ellas, el desbloqueo de cualquier conflicto 409
      // que dependiera de que esta sync avance) sí se confirman con normalidad.
      const metadataToInsert = { ...backupData.metadata };
      for (const category of failedCategories) {
        delete metadataToInsert[category];
      }

      await dbInsertMetadata(metadataToInsert);
    });
  } catch (error) {
    throw new Error(`Restore failed: ${error.message}`);
  }
};

export const dbExportDataBackup = async (backupData: BackupDataType) => {
  try {
    const obj: BackupDataType = {};

    const oldData = await dbGetTableData();

    const cong_access_code =
      await oldData.settings.cong_settings.cong_access_code;
    const cong_master_key =
      await oldData.settings.cong_settings.cong_master_key;

    const accessCode = decryptData(
      backupData.app_settings.cong_settings['cong_access_code'],
      cong_access_code,
      'access_code'
    );

    let masterKey: string;

    if (
      cong_master_key &&
      cong_master_key.length > 0 &&
      backupData.app_settings.cong_settings['cong_master_key']
    ) {
      masterKey = decryptData(
        backupData.app_settings.cong_settings['cong_master_key'],
        cong_master_key,
        'master_key'
      );
    }
    // Extract remote data before restore, decrypt to compare later
    const remoteSched = backupData.sched ? (structuredClone(backupData.sched) as SchedWeekType[]) : [];
    remoteSched.forEach(r => decryptObject({ data: r, table: 'sched', accessCode }));

    const remoteDept = backupData.departments_schedule ? (structuredClone(backupData.departments_schedule) as DeptWeekType[]) : [];
    remoteDept.forEach(r => decryptObject({ data: r, table: 'departments_schedule', accessCode }));

    const remoteOuting = backupData.service_outings ? (structuredClone(backupData.service_outings) as ServiceOutingWeekType[]) : [];
    remoteOuting.forEach(r => decryptObject({ data: r, table: 'service_outings', accessCode }));

    const remoteExhibitor = backupData.exhibitors ? (structuredClone(backupData.exhibitors) as ExhibitorWeekType[]) : [];
    remoteExhibitor.forEach(r => decryptObject({ data: r, table: 'exhibitors', accessCode }));

    await dbRestoreFromBackup(backupData, accessCode, masterKey);

    const {
      persons,
      settings,
      outgoing_speakers,
      speakers_congregations,
      visiting_speakers,
      user_bible_studies,
      user_field_service_reports,
      cong_field_service_reports,
      field_service_groups,
      branch_cong_analysis,
      branch_field_service_reports,
      sched,
      departments_schedule,
      service_outings,
      exhibitors,
      responsabilidades,
      limpieza_config,
      evacuacion_config,
      public_talks_override,
      sources,
      meeting_attendance,
      metadata,
      delegated_field_service_reports,
      upcoming_events,
      territories,
      territory_zones,
      territory_tags,
      territory_assignments,
      territory_campaigns,
      territory_notices,
      territory_requests,
      territory_settings,
      circuit_overseer_visits,
    } = await dbGetTableData();

    const affectedUids = new Set<string>();

    // Person references in these schedule-shaped tables always live under a
    // 'value' or 'person' key (chairman/outgoing_talks/departments use
    // 'value'; service_outings/exhibitors use 'person'). Record-own 'id'
    // fields are also UUID-shaped but are NOT person references — collecting
    // those too would tell the backend to wake people who have no actual
    // change, which is how this used to misfire.
    const PERSON_REF_KEYS = new Set(['value', 'person']);

    const extractPersonUids = (o: unknown): Set<string> => {
      const uuids = new Set<string>();
      const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const traverse = (item: unknown) => {
        if (Array.isArray(item)) {
          item.forEach(traverse);
        } else if (item !== null && typeof item === 'object') {
          for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
            if (PERSON_REF_KEYS.has(key) && typeof value === 'string' && regex.test(value)) {
              uuids.add(value);
            } else {
              traverse(value);
            }
          }
        }
      };
      traverse(o);
      return uuids;
    };

    interface DiffableItem extends Record<string, unknown> {
      updatedAt?: string;
    }

    const checkDiff = <T extends DiffableItem>(
      localArray: T[],
      remoteArray: T[],
      keyField: keyof T & string
    ) => {
      // Cold-start guard: an empty remote baseline (first sync, or a backup
      // that hasn't caught up yet) is not evidence of a real edit — diffing
      // against it would flag every assigned person in every local week as
      // "affected" in one shot. Mirrors the seeding guard the client-side
      // per-device diff already has (checkAndQueueAssignmentPush).
      if (remoteArray.length === 0 && localArray.length > 0) return;

      for (const local of localArray) {
        const remote = remoteArray.find((r) => r[keyField] === local[keyField]);
        const localUpdated = local.updatedAt || '';
        const remoteUpdated = remote?.updatedAt || '';
        if (!remote || localUpdated > remoteUpdated) {
          const oldUids = remote ? extractPersonUids(remote) : new Set<string>();
          const newUids = extractPersonUids(local);
          for (const uid of oldUids) if (!newUids.has(uid)) affectedUids.add(uid);
          for (const uid of newUids) if (!oldUids.has(uid)) affectedUids.add(uid);
        }
      }
    };

    if (metadata.metadata.schedules?.send_local) checkDiff(sched, remoteSched, 'weekOf');
    if (metadata.metadata.departments_schedule?.send_local) checkDiff(departments_schedule, remoteDept, 'weekOf');
    if (metadata.metadata.service_outings?.send_local) checkDiff(service_outings, remoteOuting, 'weekOf');
    if (metadata.metadata.exhibitors?.send_local) checkDiff(exhibitors, remoteExhibitor, 'weekOf');

    if (affectedUids.size > 0) {
      obj.affected_uids = Array.from(affectedUids);
    }

    const dataSync = settings.cong_settings.data_sync.value;
    const accountType = settings.user_settings.account_type;
    const userRole = settings.user_settings.cong_role;

    const { user_settings, cong_settings } = settings;

    const secretaryRole = userRole.includes('secretary');
    const coordinatorRole = userRole.includes('coordinator');
    const elderRole = userRole.includes('elder');
    const groupOverseerRole = userRole.includes('group_overseers');
    const languageGroupOverseerRole = userRole.includes(
      'language_group_overseers'
    );

    const adminRole =
      userRole.includes('admin') || secretaryRole || coordinatorRole;

    const serviceCommitteeRole =
      adminRole || userRole.some((role) => role === 'service_overseer');

    const publicTalkEditor =
      adminRole || userRole.some((role) => role === 'public_talk_schedule');

    const scheduleEditor =
      adminRole ||
      publicTalkEditor ||
      userRole.some(
        (role) => role === 'midweek_schedule' || role === 'weekend_schedule'
      );

    const personEditor = serviceCommitteeRole || scheduleEditor;

    const settingEditor =
      adminRole || languageGroupOverseerRole || scheduleEditor;

    const isPublisher = userRole.includes('publisher');

    const attendanceTracker =
      adminRole ||
      languageGroupOverseerRole ||
      userRole.includes('attendance_tracking');

    const userBaseSettings = {
      firstname: user_settings.firstname,
      lastname: user_settings.lastname,
    };

    const myPerson = persons.find(
      (record) => record.person_uid === user_settings.user_local_uid
    );

    if (dataSync) {
      if (accountType === 'vip') {
        if (metadata.metadata.user_settings.send_local) {
          obj.app_settings = { user_settings: userBaseSettings };
        }

        // include settings data
        if (settingEditor) {
          const localSettings = structuredClone(settings);

          encryptObject({
            data: localSettings,
            table: 'app_settings',
            masterKey,
            accessCode,
          });

          if (metadata.metadata.user_settings.send_local) {
            obj.app_settings.user_settings = localSettings.user_settings;
          }

          if (metadata.metadata.cong_settings.send_local) {
            if (!obj.app_settings) {
              obj.app_settings = { cong_settings: {} };
            }

            obj.app_settings.cong_settings = localSettings.cong_settings;
          }
        }

        // include person data
        if (personEditor && metadata.metadata.persons.send_local) {
          const backupPersons = persons.map((person) => {
            encryptObject({
              data: person,
              table: 'persons',
              masterKey,
              accessCode,
            });

            return person;
          });

          obj.persons = backupPersons;
        }

        // include visiting speakers info
        if (publicTalkEditor) {
          if (metadata.metadata.speakers_congregations.send_local) {
            const congregations = speakers_congregations.map((congregation) => {
              encryptObject({
                data: congregation,
                table: 'speakers_congregations',
                masterKey,
                accessCode,
              });

              return congregation;
            });

            obj.speakers_congregations = congregations;
          }

          if (metadata.metadata.visiting_speakers.send_local) {
            const speakers = visiting_speakers.map((speaker) => {
              encryptObject({
                data: speaker,
                table: 'visiting_speakers',
                masterKey,
                accessCode,
              });

              return speaker;
            });

            obj.visiting_speakers = speakers;
          }

          const speakersKey =
            backupData.speakers_key?.length > 0
              ? decryptData(backupData.speakers_key, masterKey, 'speakers_key')
              : generateKey();

          if (
            metadata.metadata.persons.send_local ||
            metadata.metadata.visiting_speakers.send_local ||
            !backupData.speakers_key ||
            backupData?.speakers_key.length === 0
          ) {
            const outgoing = outgoing_speakers.map((speaker) => {
              encryptObject({
                data: speaker,
                table: 'visiting_speakers',
                masterKey: speakersKey,
              });

              return speaker;
            });

            obj.outgoing_speakers = outgoing;
          }

          if (
            !backupData.speakers_key ||
            backupData?.speakers_key.length === 0
          ) {
            obj.speakers_key = encryptData(speakersKey, masterKey);
          }
        }

        // include self data if not person editor
        if (
          !personEditor &&
          isPublisher &&
          metadata.metadata.persons.send_local
        ) {
          const person = {
            person_uid: myPerson.person_uid,
            person_data: {
              timeAway:
                myPerson.person_data.timeAway?.filter(
                  (record) => !record._deleted
                ) || [],
              emergency_contacts:
                myPerson.person_data.emergency_contacts.filter(
                  (record) => !record._deleted
                ),
            },
          };

          encryptObject({
            data: person,
            table: 'persons',
            masterKey,
            accessCode,
          });

          obj.persons = [person];
        }

        // include field service groups
        if (
          serviceCommitteeRole &&
          metadata.metadata.field_service_groups.send_local
        ) {
          const backupGroups = field_service_groups.map((group) => {
            encryptObject({
              data: group,
              table: 'field_service_groups',
              accessCode,
            });

            return group;
          });

          obj.field_service_groups = backupGroups;
        }

        // include field service reports
        if (
          (adminRole ||
            elderRole ||
            groupOverseerRole ||
            languageGroupOverseerRole) &&
          metadata.metadata.cong_field_service_reports.send_local
        ) {
          const backupReports = cong_field_service_reports.map((report) => {
            encryptObject({
              data: report,
              table: 'cong_field_service_reports',
              accessCode,
            });

            return report;
          });

          obj.cong_field_service_reports = backupReports;
        }

        // include schedules data
        if (scheduleEditor) {
          if (metadata.metadata.schedules.send_local) {
            const backupSched = sched.map((record) => {
              const schedule = structuredClone(record);

              encryptObject({
                data: schedule,
                table: 'sched',
                accessCode,
              });

              return schedule;
            });

            obj.sched = backupSched;

            const backupDeptSchedule = departments_schedule.map((record) => {
              const dept = structuredClone(record);

              encryptObject({
                data: dept,
                table: 'departments_schedule',
                accessCode,
              });

              return dept;
            });

            obj.departments_schedule = backupDeptSchedule;
          }

          if (metadata.metadata.sources.send_local) {
            const backupSources = sources.map((source) => {
              encryptObject({
                data: source,
                table: 'sources',
                accessCode,
              });

              return source;
            });

            obj.sources = backupSources;
          }
        }

        // include meeting attendance
        if (
          attendanceTracker &&
          metadata.metadata.meeting_attendance.send_local
        ) {
          const backupAttendance = meeting_attendance.map((attendance) => {
            encryptObject({
              data: attendance,
              table: 'meeting_attendance',
              accessCode,
            });

            return attendance;
          });

          obj.meeting_attendance = backupAttendance;
        }

        // include service outings data
        if (
          serviceCommitteeRole &&
          metadata.metadata.service_outings?.send_local
        ) {
          const backupServiceOutings = service_outings.map((record) => {
            const outing = structuredClone(record);

            encryptObject({
              data: outing,
              table: 'service_outings',
              accessCode,
            });

            return outing;
          });

          obj.service_outings = backupServiceOutings;
        }

        // include exhibitors data
        if (
          serviceCommitteeRole &&
          metadata.metadata.exhibitors?.send_local
        ) {
          const backupExhibitors = exhibitors.map((record) => {
            const exhibitor = structuredClone(record);

            encryptObject({
              data: exhibitor,
              table: 'exhibitors',
              accessCode,
            });

            return exhibitor;
          });

          obj.exhibitors = backupExhibitors;
        }

        // include responsabilidades data (visible to all, editable by elders/admin)
        if (
          (elderRole || adminRole) &&
          metadata.metadata.responsabilidades?.send_local
        ) {
          const record = responsabilidades[0];

          if (record) {
            const toBackup = structuredClone(record);

            encryptObject({
              data: toBackup,
              table: 'responsabilidades',
              accessCode,
            });

            obj.responsabilidades = toBackup;
          }
        }

        // include limpieza_config data
        if (
          metadata.metadata.limpieza_config?.send_local
        ) {
          if (limpieza_config) {
            const toBackup = structuredClone(limpieza_config);

            encryptObject({
              data: toBackup,
              table: 'limpieza_config',
              accessCode,
            });

            obj.limpieza_config = toBackup;
          }
        }

        // include evacuacion_config data
        if (
          metadata.metadata.evacuacion_config?.send_local
        ) {
          if (evacuacion_config) {
            const toBackup = structuredClone(evacuacion_config);

            encryptObject({
              data: toBackup,
              table: 'evacuacion_config',
              accessCode,
            });

            obj.evacuacion_config = toBackup;
          }
        }

        // include public_talks_override data
        if (metadata.metadata.public_talks_override?.send_local) {
          if (public_talks_override) {
            const toBackup = structuredClone(public_talks_override);

            encryptObject({
              data: toBackup,
              table: 'public_talks_override',
              accessCode,
            });

            obj.public_talks_override = toBackup;
          }
        }



        // include territories data
        if (adminRole || elderRole || metadata.metadata.territories?.send_local) {
          const toAdd = [
            { name: 'territories', data: territories },
            { name: 'territory_zones', data: territory_zones },
            { name: 'territory_tags', data: territory_tags },
            { name: 'territory_assignments', data: territory_assignments },
            { name: 'territory_campaigns', data: territory_campaigns },
            { name: 'territory_notices', data: territory_notices },
            { name: 'territory_requests', data: territory_requests },
            { name: 'territory_settings', data: territory_settings },
          ];

          for (const item of toAdd) {
            if (item.data && item.data.length > 0) {
              const toBackup = structuredClone(item.data);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              toBackup.forEach((rec: any) => {
                encryptObject({
                  data: rec,
                  table: item.name,
                  accessCode,
                  masterKey,
                });
              });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (obj as any)[item.name] = toBackup;
            }
          }
        }

        // include circuit overseer visits (gestionado por COBA/Admin; ancianos
        // pueden verlas). Cifrado por registro como las demás listas.
        if (
          adminRole ||
          elderRole ||
          metadata.metadata.circuit_overseer_visits?.send_local
        ) {
          if (circuit_overseer_visits && circuit_overseer_visits.length > 0) {
            const toBackup = structuredClone(circuit_overseer_visits);
            toBackup.forEach((rec) => {
              encryptObject({
                data: rec,
                table: 'circuit_overseer_visits',
                accessCode,
                masterKey,
              });
            });

            obj.circuit_overseer_visits = toBackup;
          }
        }

        // for admin role
        if (adminRole) {
          // include branch reports
          if (metadata.metadata.branch_field_service_reports.send_local) {
            const backupBranchReports = branch_field_service_reports.map(
              (report) => {
                encryptObject({
                  data: report,
                  table: 'branch_field_service_reports',
                  accessCode,
                });

                return report;
              }
            );

            obj.branch_field_service_reports = backupBranchReports;
          }

          // include branch cong analysis
          if (metadata.metadata.branch_cong_analysis.send_local) {
            const backupAnalysis = branch_cong_analysis.map((analysis) => {
              encryptObject({
                data: analysis,
                table: 'branch_cong_analysis',
                accessCode,
              });

              return analysis;
            });

            obj.branch_cong_analysis = backupAnalysis;
          }

          // include upcoming events
          if (metadata.metadata.upcoming_events?.send_local) {
            const backupUpcomingEvents = upcoming_events.map((study) => {
              encryptObject({
                data: study,
                table: 'upcoming_events',
                accessCode,
              });

              return study;
            });

            obj.upcoming_events = backupUpcomingEvents;
          }
        }

        // include user role changes
        if (adminRole && backupData.cong_users) {
          const congUsers: CongUserType[] = [];
          const { persons: dbPersons, field_service_groups } =
            await dbGetTableData();

          for (const user of backupData.cong_users) {
            const person = dbPersons.find(
              (record) => record.person_uid === user.local_uid
            );

            if (!person) continue;

            let userRole =
              user.role?.filter(
                (role) => !APP_READ_ONLY_ROLES.includes(role)
              ) ?? [];

            const isMidweekStudent =
              person.person_data.midweek_meeting_student.active.value;

            const isPublisher =
              personIsBaptizedPublisher(person) ||
              personIsUnbaptizedPublisher(person);

            const isElder = personIsPrivilegeActive(person, 'elder');
            const isMS = personIsPrivilegeActive(person, 'ms');

            if (isMidweekStudent || isPublisher) {
              userRole.push('view_schedules');
            }

            if (isPublisher) {
              userRole.push('publisher');
            }

            if (isElder) {
              userRole.push('elder');
            }

            if (isMS) {
              userRole.push('ms');
            }

            const group = field_service_groups.find((record) =>
              record.group_data.members.some(
                (member) => member.person_uid === person.person_uid
              )
            );

            const publisher = group?.group_data.members.find(
              (member) => member.person_uid === person.person_uid
            );

            if (publisher) {
              const isLanguageGroup = group.group_data.language_group;
              const isOverseer =
                publisher?.isOverseer || publisher?.isAssistant || false;

              if (isOverseer) {
                userRole.push(
                  isLanguageGroup
                    ? 'language_group_overseers'
                    : 'group_overseers'
                );
              }
            }

            userRole = Array.from(new Set(userRole));

            let roleChanged = false;

            const hasNewRole = userRole.some(
              (role) => !user.role.includes(role)
            );

            roleChanged = hasNewRole || userRole.length !== user.role.length;

            if (roleChanged) {
              const newUser = structuredClone(user);
              newUser.role = userRole;

              congUsers.push(newUser);

              // update local value
              const dbSettings = await dbGetSettings();
              const localUid = dbSettings.user_settings.user_local_uid;

              if (user.local_uid === localUid) {
                await appDb.app_settings.update(1, {
                  'user_settings.cong_role': newUser.role,
                });
              }
            }
          }

          if (congUsers.length > 0) {
            obj.cong_users = congUsers;
          }
        }
      }

      // include user settings, time away, emergency contacts
      if (accountType === 'pocket') {
        if (metadata.metadata.user_settings.send_local) {
          const userSettings = {
            ...userBaseSettings,
            backup_automatic: settings.user_settings.backup_automatic,
            theme_follow_os_enabled:
              settings.user_settings.theme_follow_os_enabled,
            hour_credits_enabled: settings.user_settings.hour_credits_enabled,
          };

          encryptObject({
            data: userSettings,
            table: 'app_settings',
            accessCode,
          });

          obj.app_settings = { user_settings: userSettings };
        }

        if (myPerson && metadata.metadata.persons.send_local) {
          const person = {
            person_uid: myPerson.person_uid,
            person_data: {
              timeAway: myPerson.person_data.timeAway.filter(
                (record) => !record._deleted
              ),
              emergency_contacts:
                myPerson.person_data.emergency_contacts.filter(
                  (record) => !record._deleted
                ),
            },
          };

          encryptObject({
            data: person,
            table: 'persons',
            masterKey,
            accessCode,
          });

          obj.persons = [person];
        }
      }

      // include publisher bible studies and field reports
      if (isPublisher) {
        if (metadata.metadata.user_bible_studies.send_local) {
          const backupBibleStudies = user_bible_studies.map((study) => {
            encryptObject({
              data: study,
              table: 'user_bible_studies',
              accessCode,
            });

            return study;
          });

          obj.user_bible_studies = backupBibleStudies;
        }

        if (metadata.metadata.user_field_service_reports.send_local) {
          const backupReports = user_field_service_reports.map((report) => {
            encryptObject({
              data: report,
              table: 'user_field_service_reports',
              accessCode,
            });

            return report;
          });

          obj.user_field_service_reports = backupReports;
        }

        if (metadata.metadata.delegated_field_service_reports.send_local) {
          const backupReports = delegated_field_service_reports.map(
            (report) => {
              encryptObject({
                data: report,
                table: 'delegated_field_service_reports',
                accessCode,
              });

              return report;
            }
          );

          obj.delegated_field_service_reports = backupReports;
        }
      }
    }

    if (!dataSync) {
      if (accountType === 'vip') {
        if (metadata.metadata.user_settings.send_local) {
          obj.app_settings = { user_settings: userBaseSettings };
        }

        if (settingEditor) {
          const midweek = cong_settings.midweek_meeting.map((record) => {
            return {
              type: record.type,
              weekday: record.weekday,
              time: record.time,
            };
          });

          const weekend = cong_settings.weekend_meeting.map((record) => {
            return {
              type: record.type,
              weekday: record.weekday,
              time: record.time,
            };
          });

          if (metadata.metadata.user_settings.send_local) {
            obj.app_settings.user_settings = {
              ...obj.app_settings.user_settings,
              cong_role: user_settings.cong_role,
              account_type: user_settings.account_type,
              user_local_uid: user_settings.user_local_uid,
            };
          }

          if (metadata.metadata.cong_settings.send_local) {
            if (!obj.app_settings) {
              obj.app_settings = {};
            }

            obj.app_settings.cong_settings = {
              cong_circuit: cong_settings.cong_circuit,
              cong_discoverable: cong_settings.cong_discoverable,
              cong_location: cong_settings.cong_location,
              cong_name: cong_settings.cong_name,
              cong_new: cong_settings.cong_new,
              cong_number: cong_settings.cong_number,
              country_code: cong_settings.country_code,
              data_sync: cong_settings.data_sync,
              midweek_meeting: midweek,
              weekend_meeting: weekend,
              group_publishers_sort: cong_settings.group_publishers_sort,
              first_day_week: cong_settings.first_day_week,
            };
          }
        }
      }

      if (accountType === 'pocket') {
        if (metadata.metadata.user_settings.send_local) {
          obj.app_settings = { user_settings: userBaseSettings };
        }
      }
    }

    return obj;
  } catch (error) {
    console.error(error);
    throw new Error(error.message);
  }
};

export const dbClearExportState = async () => {
  const metadata = await appDb.metadata.get(1);

  const oldMetadata = metadata.metadata;
  const newMetadata = {} as MetadataRecordType['metadata'];

  for (const [key, values] of Object.entries(oldMetadata)) {
    newMetadata[key] = { version: values.version, send_local: false };
  }

  await appDb.metadata.update(metadata.id, {
    metadata: newMetadata,
  });
};
