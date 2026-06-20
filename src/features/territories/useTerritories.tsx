import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { congIDState, congMasterKeyState, fullnameOptionState } from '@states/settings';
import { responsabilidadesState } from '@states/responsabilidades';
import { personsState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import { getTerritoryManagersUids } from './utils/managers';
import {
  useCanReceiveTerritoryRequestNotifications,
  useIsTerritoryManager,
} from './useIsTerritoryManager';
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
  backfillMissingReturnedAt,
} from '@services/firebase/territories';
import { DEFAULT_TERRITORY_SETTINGS } from '@definition/territories';

// Singletons de módulo — evitan suscripciones duplicadas cuando varios
// componentes usan useTerritories a la vez. Se reinician si cambia el
// congId (logout/cambio de cuenta) O si llega la masterKey por primera vez
// (la clave puede llegar después de que el módulo ya estuviera montado).
let _activeCongId: string | null = null;
let _activeMasterKey: string = '';
let _unsubs: Array<() => void> = [];
// Cuenta cuántos componentes montados están usando el hook ahora mismo, para
// no cerrar las suscripciones mientras alguno todavía las necesita, pero sí
// cerrarlas en cuanto el último se desmonta (p.ej. al salir de la página).
let _refCount = 0;

const teardown = () => {
  _unsubs.forEach((u) => u());
  _unsubs = [];
  _activeCongId = null;
  _activeMasterKey = '';
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
  const canManage = useIsTerritoryManager();
  const assignments = useAtomValue(territoryAssignmentsState);

  // Cierra las 9 suscripciones cuando el último componente que las usa se
  // desmonta (p.ej. el usuario navega fuera de Territorios), para no dejar
  // conexiones de Firestore corriendo en segundo plano el resto de la sesión.
  useEffect(() => {
    _refCount += 1;

    return () => {
      _refCount -= 1;
      if (_refCount === 0) teardown();
    };
  }, []);

  useEffect(() => {
    if (!congId) return;

    const key = masterKey ?? '';

    // Re-suscribir si cambia la congregación O si la masterKey cambia de valor
    // (primera llegada vacía→clave, o rotación clave-A→clave-B). Esto garantiza
    // que los campos cifrados se descifren con la clave correcta en todo momento.
    const congChanged = _activeCongId !== congId;
    const keyChanged = key !== _activeMasterKey;

    if (!congChanged && !keyChanged) return;

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

    // 3. Comparar con lo almacenado en settings (orden-independiente)
    const storedManagers = settings.managers || [];
    const sortedStored = [...storedManagers].sort((a, b) => a.uid.localeCompare(b.uid));
    const sortedCurrent = [...currentManagers].sort((a, b) => a.uid.localeCompare(b.uid));
    const isSame =
      sortedStored.length === sortedCurrent.length &&
      sortedStored.every((sm, i) => {
        const cm = sortedCurrent[i];
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

  // Migración de un solo uso: rellena returnedAt: null en asignaciones
  // abiertas creadas antes de que ese valor se escribiera explícito. Solo
  // quien puede escribir asignaciones (responsable/admin) lo intenta, para
  // no generar errores de permiso en los dispositivos de publicadores.
  // Idempotente: una vez migradas, dejan de aparecer en el filtro y no
  // se reescriben en cargas siguientes.
  useEffect(() => {
    if (!congId || !canManage || assignments.length === 0) return;

    backfillMissingReturnedAt(congId, assignments).catch((err) =>
      console.error('Failed to backfill returnedAt:', err)
    );
  }, [congId, canManage, assignments]);
};
