import appDb from '@db/appDb';
import backupsDb from '@db/backupsDb';
import { googleDriveUploadBackup } from './googleDriveBackup';

const STORAGE_KEYS = {
  LAST_AUTO_BACKUP: 'elda_centro_last_auto_backup',
};

// Generates a complete database JSON payload (matching standard useExport)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateBackupPayload = async (): Promise<any> => {
  const persons = await appDb.persons.toArray();
  const settingsArray = await appDb.app_settings.toArray();
  const settings = settingsArray[0];
  const branchCongAnalysis = await appDb.branch_cong_analysis.toArray();
  const branchFieldReports = await appDb.branch_field_service_reports.toArray();
  const congFieldReports = await appDb.cong_field_service_reports.toArray();
  const fieldServiceGroups = await appDb.field_service_groups.toArray();
  const meetingAttendance = await appDb.meeting_attendance.toArray();
  const schedules = await appDb.sched.toArray();
  const sources = await appDb.sources.toArray();
  const visitingSpeakers = await appDb.visiting_speakers.toArray();
  const assignments = await appDb.assignment.toArray();
  const weekTypes = await appDb.weekType.toArray();
  const speakersCongregations = await appDb.speakers_congregations.toArray();
  const userFieldReports = await appDb.user_field_service_reports.toArray();
  const userBibleStudies = await appDb.user_bible_studies.toArray();
  const upcomingEvents = await appDb.upcoming_events.toArray();

  const handleGetSettings = () => {
    if (!settings) return null;
    const app_settings = structuredClone(settings);
    app_settings.cong_settings.cong_master_key = undefined;
    app_settings.cong_settings.cong_access_code = undefined;
    return app_settings;
  };

  const handleGetAssignments = () => {
    return assignments.map((record) => ({
      code: record.code,
      assignment_type_name: record.assignment_type_name.E,
    }));
  };

  const handleGetWeekTypes = () => {
    return weekTypes.map((record) => ({
      id: record.id,
      week_type_name: record.week_type_name.E,
    }));
  };

  return {
    name: 'Organized',
    exported: new Date().toISOString(),
    version: import.meta.env.PACKAGE_VERSION || '1.0.0',
    data: {
      assignments: handleGetAssignments(),
      app_settings: handleGetSettings(),
      branch_cong_analysis: branchCongAnalysis,
      branch_field_service_reports: branchFieldReports,
      cong_field_service_reports: congFieldReports,
      field_service_groups: fieldServiceGroups,
      meeting_attendance: meetingAttendance,
      persons: persons.filter((record) => !record._deleted?.value),
      sched: schedules,
      sources,
      speakers_congregations: speakersCongregations,
      upcoming_events: upcomingEvents,
      user_field_service_reports: userFieldReports.filter(
        (record) => !record.report_data?._deleted
      ),
      user_bible_studies: userBibleStudies.filter(
        (record) => !record.person_data?._deleted
      ),
      visiting_speakers: visitingSpeakers,
      week_type: handleGetWeekTypes(),
    },
  };
};

// Cleans up old snapshots based on the smart retention policy
export const applySmartRetentionPolicy = async () => {
  const limits = {
    daily: 7,
    weekly: 4,
    monthly: 12,
  };

  for (const type of ['daily', 'weekly', 'monthly'] as const) {
    const snapshots = await backupsDb.snapshots
      .where('type')
      .equals(type)
      .sortBy('timestamp'); // Ascending order (oldest first)

    const excessCount = snapshots.length - limits[type];
    if (excessCount > 0) {
      const idsToDelete = snapshots.slice(0, excessCount).map((s) => s.id!);
      await backupsDb.snapshots.bulkDelete(idsToDelete);
      console.log(`Deleted ${excessCount} old ${type} backup snapshots.`);
    }
  }
};

// Restores the main database state from a backup payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const restoreFromPayload = async (payload: any): Promise<void> => {
  if (!payload || payload.name !== 'Organized' || !payload.data) {
    throw new Error('Invalid backup file payload');
  }

  const { data } = payload;

  // Clear existing primary tables (Dexie operations are transaction-safe)
  await appDb.transaction('rw', [
    appDb.persons,
    appDb.app_settings,
    appDb.branch_cong_analysis,
    appDb.branch_field_service_reports,
    appDb.cong_field_service_reports,
    appDb.field_service_groups,
    appDb.meeting_attendance,
    appDb.sched,
    appDb.sources,
    appDb.speakers_congregations,
    appDb.visiting_speakers,
    appDb.user_field_service_reports,
    appDb.user_bible_studies,
    appDb.upcoming_events,
  ], async () => {
    await appDb.persons.clear();
    await appDb.branch_cong_analysis.clear();
    await appDb.branch_field_service_reports.clear();
    await appDb.cong_field_service_reports.clear();
    await appDb.field_service_groups.clear();
    await appDb.meeting_attendance.clear();
    await appDb.sched.clear();
    await appDb.sources.clear();
    await appDb.speakers_congregations.clear();
    await appDb.visiting_speakers.clear();
    await appDb.user_field_service_reports.clear();
    await appDb.user_bible_studies.clear();
    await appDb.upcoming_events.clear();

    // Populate data
    if (data.persons) await appDb.persons.bulkAdd(data.persons);
    if (data.branch_cong_analysis) await appDb.branch_cong_analysis.bulkAdd(data.branch_cong_analysis);
    if (data.branch_field_service_reports) await appDb.branch_field_service_reports.bulkAdd(data.branch_field_service_reports);
    if (data.cong_field_service_reports) await appDb.cong_field_service_reports.bulkAdd(data.cong_field_service_reports);
    if (data.field_service_groups) await appDb.field_service_groups.bulkAdd(data.field_service_groups);
    if (data.meeting_attendance) await appDb.meeting_attendance.bulkAdd(data.meeting_attendance);
    if (data.sched) await appDb.sched.bulkAdd(data.sched);
    if (data.sources) await appDb.sources.bulkAdd(data.sources);
    if (data.speakers_congregations) await appDb.speakers_congregations.bulkAdd(data.speakers_congregations);
    if (data.visiting_speakers) await appDb.visiting_speakers.bulkAdd(data.visiting_speakers);
    if (data.user_field_service_reports) await appDb.user_field_service_reports.bulkAdd(data.user_field_service_reports);
    if (data.user_bible_studies) await appDb.user_bible_studies.bulkAdd(data.user_bible_studies);
    if (data.upcoming_events) await appDb.upcoming_events.bulkAdd(data.upcoming_events);

    if (data.app_settings) {
      await appDb.app_settings.clear();
      await appDb.app_settings.add(data.app_settings);
    }
  });
};

// Scheduler function executed on startup for admins
export const triggerAutoBackup = async (isAdmin: boolean) => {
  if (!isAdmin) return;

  const now = new Date();
  const lastBackupStr = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_BACKUP);
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (lastBackupStr) {
    const lastBackupTime = parseInt(lastBackupStr, 10);
    if (now.getTime() - lastBackupTime < twentyFourHours) {
      // 24 hours have not elapsed yet. Skip auto-backup.
      return;
    }
  }

  try {
    console.log('Starting automated hybrid database backup...');
    const payload = await generateBackupPayload();
    const payloadString = JSON.stringify(payload);
    const sizeInBytes = new Blob([payloadString]).size;
    const isoString = now.toISOString();

    // 1. Create Local Snapshots
    // Always add a daily backup
    await backupsDb.snapshots.add({
      timestamp: isoString,
      type: 'daily',
      size: sizeInBytes,
      data: payload,
    });

    // Save as weekly backup if it is Sunday
    if (now.getDay() === 0) {
      await backupsDb.snapshots.add({
        timestamp: isoString,
        type: 'weekly',
        size: sizeInBytes,
        data: payload,
      });
    }

    // Save as monthly backup if it is the first day of the month
    if (now.getDate() === 1) {
      await backupsDb.snapshots.add({
        timestamp: isoString,
        type: 'monthly',
        size: sizeInBytes,
        data: payload,
      });
    }

    // 2. Apply Retention and rotation rules
    await applySmartRetentionPolicy();

    // 3. Upload to Google Drive (if enabled)
    await googleDriveUploadBackup(payload);

    // 4. Update the last backup timestamp in localStorage
    localStorage.setItem(STORAGE_KEYS.LAST_AUTO_BACKUP, now.getTime().toString());
    console.log('Automated hybrid backup completed successfully.');
  } catch (error) {
    console.error('Automated backup scheduler failed:', error);
  }
};
