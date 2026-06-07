import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { congIDState, congMasterKeyState, fullnameOptionState } from '@states/settings';
import { responsabilidadesState } from '@states/responsabilidades';
import { personsState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import { getTerritoryManagersUids } from './utils/managers';
import { useCanReceiveTerritoryRequestNotifications } from './useIsTerritoryManager';
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
  const responsabilidades = useAtomValue(responsabilidadesState);
  const persons = useAtomValue(personsState);
  const settings = useAtomValue(territorySettingsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const isManager = useCanReceiveTerritoryRequestNotifications();

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
          setSettings({
            ...DEFAULT_TERRITORY_SETTINGS,
            ...settings,
          });
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

  useEffect(() => {
    if (!congId || !isManager || !responsabilidades || persons.length === 0 || !settings.id) return;

    // 1. Obtener los UIDs de los encargados de territorios
    const targets = getTerritoryManagersUids(responsabilidades);
    if (targets.length === 0) return;

    // 2. Resolver emails y nombres desde persons (que el manager tiene cargados localmente)
    const currentManagers = targets
      .map(uid => {
        const person = persons.find(p => p.person_uid === uid);
        return {
          uid,
          email: person?.person_data?.email?.value || '',
          name: person ? buildPersonFullname(
            person.person_data.person_lastname.value,
            person.person_data.person_firstname.value,
            fullnameOption
          ) : '',
        };
      })
      .filter(m => !!m.uid);

    // 3. Comparar con lo almacenado en settings
    const storedManagers = settings.managers || [];
    const isSame =
      storedManagers.length === currentManagers.length &&
      storedManagers.every((sm, i) => {
        const cm = currentManagers[i];
        return cm && sm.uid === cm.uid && sm.email === cm.email && sm.name === cm.name;
      });

    if (!isSame) {
      const updatedSettings = {
        ...settings,
        managers: currentManagers,
        updatedAt: new Date().toISOString(),
      };
      saveSettings(congId, updatedSettings).catch((err) =>
        console.error('Failed to sync managers to settings:', err)
      );
    }
  }, [congId, isManager, responsabilidades, persons, settings, fullnameOption]);
};
