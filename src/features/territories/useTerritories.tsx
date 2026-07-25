import { useEffect, useRef } from 'react';
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
  territoriesLoadingState,
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
  backfillOpenAssignmentLocks,
  backfillDueAtFormula,
  closeCampaign,
  activateCampaignIfPlanned,
} from '@services/firebase/territories';
import { isCampaignOver, isCampaignRunning } from '@services/app/territories';
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
  const setLoading = useSetAtom(territoriesLoadingState);
  const responsabilidades = useAtomValue(responsabilidadesState);
  const persons = useAtomValue(personsState);
  const settings = useAtomValue(territorySettingsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const isManager = useCanReceiveTerritoryRequestNotifications();
  const canManage = useIsTerritoryManager();
  const assignments = useAtomValue(territoryAssignmentsState);
  const territories = useAtomValue(territoriesState);
  const campaigns = useAtomValue(territoryCampaignsState);

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

    // La carga termina cuando han llegado las DOS colecciones base
    // (territorios y asignaciones). Las demás son pequeñas y no gobiernan
    // ningún estado vacío importante.
    setLoading(true);
    let gotTerritories = false;
    let gotAssignments = false;
    const markLoaded = () => {
      if (gotTerritories && gotAssignments) setLoading(false);
    };

    _unsubs.push(
      subscribeZones(congId, setZones),
      subscribeTerritories(congId, key, (rows) => {
        setTerritories(rows);
        gotTerritories = true;
        markLoaded();
      }),
      subscribeAssignments(congId, key, (rows) => {
        setAssignments(rows);
        gotAssignments = true;
        markLoaded();
      }),
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
    setLoading,
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
      // Solo se escriben los campos que este efecto realmente cambia (ver
      // el `merge: true` de saveSettings) — así no se pisa un guardado
      // concurrente de Configuración hecho desde otra pestaña/dispositivo.
      saveSettings(congId, {
        managers: currentManagers,
        updatedAt: new Date().toISOString(),
      }).catch((err) =>
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

  // Migración de un solo uso: repara territory.openAssignmentId para
  // territorios que ya tenían una asignación abierta antes de que ese
  // candado existiera. Mismo criterio que la migración de arriba (solo
  // responsables/admin, idempotente).
  useEffect(() => {
    // `assignments.length === 0` es tan imprescindible como la guarda de
    // territorios: las 9 suscripciones se crean a la vez pero cada una emite
    // por su cuenta, y asignaciones es la colección más grande (cientos de
    // documentos), así que suele llegar la última. Si esto corría en ese
    // hueco, veía "ningún territorio tiene asignación abierta" y sellaba
    // `openAssignmentId: null` en todos. Como la transacción de reparación
    // solo actúa sobre los que valen `undefined`, ese `null` se daba después
    // por migrado y NUNCA se corregía — y el candado es lo único que impide
    // asignar el mismo territorio a dos hermanos a la vez.
    if (
      !congId ||
      !canManage ||
      territories.length === 0 ||
      assignments.length === 0
    )
      return;

    backfillOpenAssignmentLocks(congId, territories, assignments).catch((err) =>
      console.error('Failed to backfill openAssignmentId:', err)
    );
  }, [congId, canManage, territories, assignments]);

  // Recalcula dueAt de asignaciones abiertas creadas con la fórmula vieja
  // (daysUntilExpiration) a la nueva (daysUntilOverdue), tras unificar
  // "Vence" y "Atrasado" en un solo umbral. A diferencia de las migraciones
  // de arriba, esto NO es de un solo uso: depende de daysUntilOverdue a
  // propósito, así que si un responsable cambia ese ajuste más adelante,
  // dueAt se recalcula para seguir en sincronía con "Atrasado" (que ya era
  // reactivo a ese mismo ajuste). Solo responsables/admin, e idempotente
  // por comparación de valores (no reescribe si ya coincide).
  useEffect(() => {
    if (!congId || !canManage || assignments.length === 0 || !settings.id) return;

    backfillDueAtFormula(congId, assignments, settings.daysUntilOverdue).catch((err) =>
      console.error('Failed to backfill dueAt formula:', err)
    );
  }, [congId, canManage, assignments, settings.id, settings.daysUntilOverdue]);

  // Auto-cierre de campañas cuya fechaFin ya pasó. Antes esto solo corría
  // dentro de CampanasTab.tsx, así que solo se disparaba si un responsable
  // tenía esa pestaña abierta — una campaña con fechaFin pasada podía
  // quedarse "activa" indefinidamente si nadie entraba ahí. Ahora corre aquí,
  // para cualquier responsable con la app de Territorios abierta.
  const closingCampaignsRef = useRef(new Set<string>());
  useEffect(() => {
    // `territories.length === 0` incluye el caso en que la suscripción a
    // territorios TODAVÍA no ha traído su primer snapshot (ej. justo al
    // cargar la app) — sin esta guarda, closeCampaign podía correr con un
    // array de territorios vacío, y `territories.find(...)` no encontraba
    // ninguno: la asignación se cerraba bien (returnedAt/status), pero
    // `lastWorkedAt`/`openAssignmentId` del territorio NUNCA se actualizaban.
    // Como la campaña ya quedaba marcada 'pasada' en ese mismo intento, no
    // había una segunda oportunidad de reintentarlo correctamente.
    if (!congId || !canManage || territories.length === 0) return;
    const now = new Date();

    // 1. Campañas terminadas -> cerrarlas (se comparan contra el FINAL del
    //    día de fechaFin, no su medianoche: antes se cerraban al empezar su
    //    último día y se perdía esa jornada).
    campaigns
      .filter(
        (c) =>
          c.estado !== 'pasada' &&
          isCampaignOver(c.fechaFin, now) &&
          !closingCampaignsRef.current.has(c.id)
      )
      .forEach((c) => {
        closingCampaignsRef.current.add(c.id);
        closeCampaign(congId, c)
          .catch((err) => console.error('Failed to auto-close campaign:', err))
          .finally(() => closingCampaignsRef.current.delete(c.id));
      });

    // 2. Campañas 'planificada' que ya empezaron -> pasar a 'activa'. Sin
    //    esto, una campaña creada por adelantado se quedaba "planificada"
    //    para siempre, y como el botón "Finalizar" solo aparece en las
    //    activas, no había forma de cerrarla a mano antes de su fecha fin.
    campaigns
      .filter(
        (c) =>
          c.estado === 'planificada' &&
          isCampaignRunning(c.fechaInicio, c.fechaFin, now)
      )
      .forEach((c) => {
        activateCampaignIfPlanned(congId, c.id)
          .catch((err) => console.error('Failed to activate campaign:', err));
      });
  }, [congId, canManage, campaigns, assignments, territories]);
};
