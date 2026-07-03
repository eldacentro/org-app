import { atom } from 'jotai';
import {
  Territory,
  TerritoryAssignment,
  TerritoryCampaign,
  TerritoryLocation,
  TerritoryNotice,
  TerritoryRequest,
  TerritorySettings,
  TerritoryTag,
  TerritoryZone,
  DEFAULT_TERRITORY_SETTINGS,
} from '@definition/territories';
import { userLocalUIDState } from './settings';

// ── Fuentes de la verdad (alimentadas por las suscripciones onSnapshot) ──
export const territoryZonesState = atom<TerritoryZone[]>([]);
export const territoriesState = atom<Territory[]>([]);
export const territoryAssignmentsState = atom<TerritoryAssignment[]>([]);
export const territoryLocationsState = atom<TerritoryLocation[]>([]);
export const territoryCampaignsState = atom<TerritoryCampaign[]>([]);
export const territoryRequestsState = atom<TerritoryRequest[]>([]);
export const territoryNoticesState = atom<TerritoryNotice[]>([]);
export const territoryTagsState = atom<TerritoryTag[]>([]);
export const territorySettingsState = atom<TerritorySettings>({
  ...DEFAULT_TERRITORY_SETTINGS,
  updatedAt: '',
});

// ── Derivados ──

/** Zonas ordenadas por su campo `orden`. */
export const territoryZonesSortedState = atom((get) => {
  return [...get(territoryZonesState)].sort((a, b) => a.orden - b.orden);
});

/** Asignaciones actualmente abiertas (sin devolver). */
export const territoryOpenAssignmentsState = atom((get) => {
  return get(territoryAssignmentsState).filter((a) => !a.returnedAt);
});

/**
 * Set de territoryId actualmente ocupados por CUALQUIER asignación abierta
 * (normal o de campaña). Antes excluía las de campaña, así que un territorio
 * en uso por una campaña activa aparecía como "Libre" en la cuadrícula de
 * Territorios y podía seleccionarse para asignar/eliminar en bloque — pese a
 * que `handleAsignar` (DialogAsignar) sí lo bloquea como ya asignado. Ahora
 * ambos coinciden.
 */
export const territoryAssignedIdsState = atom((get) => {
  const open = get(territoryOpenAssignmentsState);
  return new Set(open.map((a) => a.territoryId));
});

/** "Mis territorios": asignaciones abiertas del usuario actual. */
export const myTerritoryAssignmentsState = atom((get) => {
  const uid = get(userLocalUIDState);
  if (!uid) return [];
  return get(territoryOpenAssignmentsState).filter((a) => a.personUid === uid);
});

/** Solicitudes de territorio aún sin atender. */
export const territoryPendingRequestsState = atom((get) => {
  return get(territoryRequestsState).filter((r) => !r.atendidaPor);
});

/** Direcciones "No visitar" pendientes de aprobación. */
export const territoryPendingLocationsState = atom((get) => {
  return get(territoryLocationsState).filter((l) => !l.aprobada);
});

/** Avisos no leídos del usuario actual. */
export const myUnreadNoticesState = atom((get) => {
  const uid = get(userLocalUIDState);
  if (!uid) return [];
  return get(territoryNoticesState).filter(
    (n) => n.personUid === uid && !n.leido
  );
});
