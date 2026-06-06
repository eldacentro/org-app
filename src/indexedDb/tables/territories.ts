import { Table } from 'dexie';
import { TerritoryFileDbRecord } from '@definition/territories';

export type TerritoriesTable = {
  territories_files: Table<TerritoryFileDbRecord, string>;
};

export const territoriesSchema = {
  territories_files: 'id, territoryId',
};
