import { Table } from 'dexie';
import { ExhibitorWeekType, ExhibitorSettingsType } from '@definition/exhibitors';

export type ExhibitorTable = {
  exhibitors: Table<ExhibitorWeekType | ExhibitorSettingsType>;
};

export const exhibitorsSchema = {
  exhibitors: 'weekOf',
};
