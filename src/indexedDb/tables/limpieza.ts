import BaseDexie from 'dexie';
import { LimpiezaConfig } from '@definition/limpieza';

export type LimpiezaTable = {
  limpieza_config: BaseDexie.Table<LimpiezaConfig, string>;
};

export const limpiezaSchema = {
  limpieza_config: 'id',
};
