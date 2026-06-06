import BaseDexie from 'dexie';
import { PlanEvacuacion } from '@definition/evacuacion';

export type EvacuacionConfigTable = {
  evacuacion_config: BaseDexie.Table<PlanEvacuacion, string>;
};

export const evacuacionConfigSchema = {
  evacuacion_config: 'id',
};
