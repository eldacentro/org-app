import appDb from '@db/appDb';
import { ExhibitorWeekType, ExhibitorSettingsType } from '@definition/exhibitors';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(
    ({ default: worker }) => worker.postMessage('startWorker')
  );
};

const dbUpdateExhibitorsMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.exhibitors = {
    ...metadata.metadata.exhibitors,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
  triggerSync();
};

export const dbExhibitorsGetSettings = async (): Promise<ExhibitorSettingsType> => {
  const settings = await appDb.exhibitors.get('settings') as ExhibitorSettingsType;
  if (settings) {
    if (!settings.turns) {
      settings.turns = [];
    }
    if (!settings.locations) {
      settings.locations = [];
    }
    if (!settings.responsibles) {
      settings.responsibles = [];
    }
    if (!settings.fixedAssignments) {
      settings.fixedAssignments = [];
    }
    if (!settings.availability) {
      settings.availability = {};
    }
    return settings;
  }

  const defaultSettings: ExhibitorSettingsType = {
    weekOf: 'settings',
    updatedAt: new Date().toISOString(),
    turns: [],
    locations: [],
    responsibles: [],
    fixedAssignments: [],
    availability: {},
  };

  await appDb.exhibitors.put(defaultSettings);
  return defaultSettings;
};

export const dbExhibitorsSaveSettings = async (settings: Omit<ExhibitorSettingsType, 'weekOf'>) => {
  const data: ExhibitorSettingsType = {
    ...settings,
    weekOf: 'settings',
    updatedAt: new Date().toISOString(),
  };
  await appDb.exhibitors.put(data);
  await dbUpdateExhibitorsMetadata();
};

export const dbExhibitorsGetWeek = async (weekOf: string): Promise<ExhibitorWeekType | undefined> => {
  return await appDb.exhibitors.get(weekOf) as ExhibitorWeekType;
};

export const dbExhibitorsSaveWeek = async (data: ExhibitorWeekType) => {
  const record: ExhibitorWeekType = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await appDb.exhibitors.put(record);
  await dbUpdateExhibitorsMetadata();
};

export const dbExhibitorsGetAll = async (): Promise<ExhibitorWeekType[]> => {
  const all = await appDb.exhibitors.toArray();
  return all.filter(item => item.weekOf !== 'settings') as ExhibitorWeekType[];
};
