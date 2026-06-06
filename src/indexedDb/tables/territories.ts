import { Table } from 'dexie';
import {
  TerritoryFileDbRecord,
  Territory,
  TerritoryZone,
  TerritoryTag,
  TerritoryAssignment,
  TerritoryCampaign,
  TerritoryNotice,
  TerritoryRequest,
  TerritorySettings,
} from '@definition/territories';

export type TerritoriesTable = {
  territories_files: Table<TerritoryFileDbRecord, string>;
  territories: Table<Territory, string>;
  territory_zones: Table<TerritoryZone, string>;
  territory_tags: Table<TerritoryTag, string>;
  territory_assignments: Table<TerritoryAssignment, string>;
  territory_campaigns: Table<TerritoryCampaign, string>;
  territory_notices: Table<TerritoryNotice, string>;
  territory_requests: Table<TerritoryRequest, string>;
  territory_settings: Table<TerritorySettings, string>;
};

export const territoriesSchema = {
  territories_files: 'id, territoryId',
  territories: 'id',
  territory_zones: 'id',
  territory_tags: 'id',
  territory_assignments: 'id',
  territory_campaigns: 'id',
  territory_notices: 'id',
  territory_requests: 'id',
  territory_settings: 'id',
};
