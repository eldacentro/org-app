import { Table } from 'dexie';
import { ServiceOutingWeekType } from '@definition/service_outings';

export type ServiceOutingTable = {
  service_outings: Table<ServiceOutingWeekType>;
};

export const serviceOutingsSchema = {
  service_outings: 'weekOf',
};
