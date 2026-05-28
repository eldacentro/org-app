import appDb from '@db/appDb';
import { ServiceOutingWeekType, ServiceOutingSettingsType } from '@definition/service_outings';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(
    ({ default: worker }) => worker.postMessage('startWorker')
  );
};

const dbUpdateServiceOutingsMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.service_outings = {
    ...metadata.metadata.service_outings,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
  triggerSync();
};

export const dbServiceOutingsGetSettings = async (): Promise<ServiceOutingSettingsType> => {
  const settings = await appDb.service_outings.get('settings') as ServiceOutingSettingsType;
  if (settings) {
    if (!settings.defaultHours) {
      settings.defaultHours = {
        monday_morning: '10:00',
        monday_afternoon: '17:00',
        tuesday_morning: '10:00',
        tuesday_afternoon: '17:00',
        wednesday_morning: '10:00',
        wednesday_afternoon: '17:00',
        thursday_morning: '10:00',
        thursday_afternoon: '17:00',
        friday_morning: '10:00',
        friday_afternoon: '17:30',
        saturday_morning: '09:45',
        saturday_afternoon: '17:00',
        sunday_morning: '10:30',
        sunday_afternoon: '17:00',
      };
    }
    if (!settings.locations) {
      settings.locations = ['Salón del Reino'];
    }
    if (!settings.availability) {
      settings.availability = {};
    }
    return settings;
  }

  // Crear configuración por defecto
  const defaultSettings: ServiceOutingSettingsType = {
    weekOf: 'settings',
    updatedAt: new Date().toISOString(),
    defaultHours: {
      monday_morning: '10:00',
      monday_afternoon: '17:00',
      tuesday_morning: '10:00',
      tuesday_afternoon: '17:00',
      wednesday_morning: '10:00',
      wednesday_afternoon: '17:00',
      thursday_morning: '10:00',
      thursday_afternoon: '17:00',
      friday_morning: '10:00',
      friday_afternoon: '17:30',
      saturday_morning: '09:45',
      saturday_afternoon: '17:00',
      sunday_morning: '10:30',
      sunday_afternoon: '17:00',
    },
    locations: ['Salón del Reino'],
    availability: {},
  };

  await appDb.service_outings.put(defaultSettings);
  return defaultSettings;
};

export const dbServiceOutingsSaveSettings = async (settings: Omit<ServiceOutingSettingsType, 'weekOf'>) => {
  const data: ServiceOutingSettingsType = {
    ...settings,
    weekOf: 'settings',
    updatedAt: new Date().toISOString(),
  };
  await appDb.service_outings.put(data);
  await dbUpdateServiceOutingsMetadata();
};

export const dbServiceOutingsGetWeek = async (weekOf: string): Promise<ServiceOutingWeekType | undefined> => {
  return await appDb.service_outings.get(weekOf);
};

export const dbServiceOutingsSaveWeek = async (data: ServiceOutingWeekType) => {
  const record: ServiceOutingWeekType = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await appDb.service_outings.put(record);
  await dbUpdateServiceOutingsMetadata();
};

export const dbServiceOutingsGetAll = async (): Promise<ServiceOutingWeekType[]> => {
  const all = await appDb.service_outings.toArray();
  return all.filter(item => item.weekOf !== 'settings');
};
