import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { congIDState, congMasterKeyState } from '@states/settings';
import {
  territoriesState,
  territoryAssignmentsState,
  territoryCampaignsState,
  territoryLocationsState,
  territoryNoticesState,
  territoryRequestsState,
  territorySettingsState,
  territoryTagsState,
  territoryZonesState,
} from '@states/territories';
import {
  subscribeAssignments,
  subscribeCampaigns,
  subscribeLocations,
  subscribeNotices,
  subscribeRequests,
  subscribeSettings,
  subscribeTags,
  subscribeTerritories,
  subscribeZones,
  saveSettings,
} from '@services/firebase/territories';
import { DEFAULT_TERRITORY_SETTINGS } from '@definition/territories';

// Singletons de módulo — evitan suscripciones duplicadas cuando varios
// componentes usan useTerritories a la vez. Se reinician si cambia el
// congId (logout/cambio de cuenta) O si llega la masterKey por primera vez
// (la clave puede llegar después de que el módulo ya estuviera montado).
let _activeCongId: string | null = null;
let _activeMasterKey: string = '';
let _unsubs: Array<() => void> = [];

const teardown = () => {
  _unsubs.forEach((u) => u());
  _unsubs = [];
};

export const useTerritories = () => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);

  const setZones = useSetAtom(territoryZonesState);
  const setTerritories = useSetAtom(territoriesState);
  const setAssignments = useSetAtom(territoryAssignmentsState);
  const setLocations = useSetAtom(territoryLocationsState);
  const setCampaigns = useSetAtom(territoryCampaignsState);
  const setRequests = useSetAtom(territoryRequestsState);
  const setNotices = useSetAtom(territoryNoticesState);
  const setTags = useSetAtom(territoryTagsState);
  const setSettings = useSetAtom(territorySettingsState);

  useEffect(() => {
    if (!congId) return;

    const key = masterKey ?? '';

    // Re-suscribir si cambia la congregación O si la masterKey llega por
    // primera vez (vacía → con valor). Esto garantiza que los campos cifrados
    // se descifren correctamente cuando la clave esté disponible.
    const congChanged = _activeCongId !== congId;
    const keyArrived = key !== '' && _activeMasterKey === '';

    if (!congChanged && !keyArrived) return;

    teardown();
    _activeCongId = congId;
    _activeMasterKey = key;

    _unsubs.push(
      subscribeZones(congId, setZones),
      subscribeTerritories(congId, key, setTerritories),
      subscribeAssignments(congId, key, setAssignments),
      subscribeLocations(congId, key, setLocations),
      subscribeCampaigns(congId, setCampaigns),
      subscribeRequests(congId, setRequests),
      subscribeNotices(congId, setNotices),
      subscribeTags(congId, setTags),
      subscribeSettings(congId, (settings) => {
        if (settings) {
          setSettings(settings);
        } else {
          // Primera vez: sembrar ajustes por defecto
          const seeded = {
            ...DEFAULT_TERRITORY_SETTINGS,
            updatedAt: new Date().toISOString(),
          };
          saveSettings(congId, seeded).catch(console.error);
          setSettings(seeded);
        }
      })
    );
  }, [
    congId,
    masterKey,
    setZones,
    setTerritories,
    setAssignments,
    setLocations,
    setCampaigns,
    setRequests,
    setNotices,
    setTags,
    setSettings,
  ]);
};
