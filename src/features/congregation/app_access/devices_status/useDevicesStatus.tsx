import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { congregationUsersState } from '@states/congregation';
import { CongregationUserType } from '@definition/api';
import { formatSyncAge } from '@utils/sync_age';
import { apiSetForceUpdate } from '@services/api/congregation';
import { displaySnackNotification } from '@services/states/app';

/**
 * Estado de los dispositivos de la congregación, para el administrador.
 *
 * Tras una temporada de cambios, saber a quién hay que echarle una mano no
 * debería ser adivinanza. Aquí se ve, por hermano: qué versión de la app tiene
 * el dispositivo que usa, cuándo sincronizó por última vez y cuándo abrió la
 * app. Los datos los informa el servidor a partir de las sesiones, así que no
 * hace falta que nadie mande nada ni que se instale nada.
 */

export type DeviceStatusRow = {
  id: string;
  name: string;
  build: number | null;
  isOutdated: boolean;
  lastSync: number | null; // minutos
  lastSyncText: string;
  lastSeen: number | null; // minutos
  lastSeenText: string;
  severity: 'ok' | 'warn' | 'bad' | 'unknown';
  devices: number;
};

// Cuándo consideramos que alguien "se ha quedado atrás". Un día entero es
// generoso a propósito: la sincronización normal es de minutos, así que 24 h
// sin sincronizar ya es señal de que algo pasa en ese dispositivo.
const SYNC_WARN_MINUTES = 24 * 60;
const SYNC_BAD_MINUTES = 7 * 24 * 60;

const minutesSince = (value?: string) => {
  if (!value) return null;

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;

  return Math.max(0, Math.floor((Date.now() - time) / 60000));
};

const buildPersonName = (user: CongregationUserType) => {
  const firstname = user.profile.firstname?.value ?? '';
  const lastname = user.profile.lastname?.value ?? '';

  const name = `${firstname} ${lastname}`.trim();

  return name.length > 0 ? name : '—';
};

const useDevicesStatus = () => {
  const users = useAtomValue(congregationUsersState);

  const [showAll, setShowAll] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const currentBuild = useMemo(() => {
    const value = Number(__BUILD_NUMBER__);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, []);

  const rows = useMemo<DeviceStatusRow[]>(() => {
    const result = users.map((user) => {
      const sessions = user.sessions ?? [];

      // De cada hermano interesa su MEJOR dispositivo: si tiene el móvil al día
      // da igual que el portátil viejo lleve un mes apagado.
      const builds = sessions
        .map((session) => Number(session.app_build))
        .filter((value) => Number.isFinite(value) && value > 0);

      const syncs = sessions
        .map((session) => minutesSince(session.last_backup))
        .filter((value): value is number => value !== null);

      const seens = sessions
        .map((session) => minutesSince(session.last_seen))
        .filter((value): value is number => value !== null);

      const build = builds.length > 0 ? Math.max(...builds) : null;
      const lastSync = syncs.length > 0 ? Math.min(...syncs) : null;
      const lastSeen = seens.length > 0 ? Math.min(...seens) : null;

      const isOutdated =
        currentBuild !== null && build !== null && build < currentBuild;

      let severity: DeviceStatusRow['severity'] = 'ok';

      if (lastSync === null) {
        // Sin dato de sincronización: o nunca ha sincronizado desde que esto
        // existe, o ese dispositivo no ha vuelto a abrirse desde entonces.
        severity = 'unknown';
      } else if (lastSync >= SYNC_BAD_MINUTES) {
        severity = 'bad';
      } else if (lastSync >= SYNC_WARN_MINUTES || isOutdated) {
        severity = 'warn';
      }

      return {
        id: user.id,
        name: buildPersonName(user),
        build,
        isOutdated,
        lastSync,
        lastSyncText: lastSync === null ? 'Sin datos' : formatSyncAge(lastSync),
        lastSeen,
        lastSeenText: lastSeen === null ? 'Sin datos' : formatSyncAge(lastSeen),
        severity,
        devices: sessions.length,
      };
    });

    // Primero quien necesita atención, y dentro de eso, el que lleva más tiempo.
    const order: Record<DeviceStatusRow['severity'], number> = {
      bad: 0,
      warn: 1,
      unknown: 2,
      ok: 3,
    };

    return result.sort((a, b) => {
      if (order[a.severity] !== order[b.severity]) {
        return order[a.severity] - order[b.severity];
      }

      return (b.lastSync ?? -1) - (a.lastSync ?? -1);
    });
  }, [users, currentBuild]);

  const needAttention = useMemo(
    () => rows.filter((row) => row.severity !== 'ok'),
    [rows]
  );

  const outdatedCount = useMemo(
    () => rows.filter((row) => row.isOutdated).length,
    [rows]
  );

  const visibleRows = showAll ? rows : needAttention;

  // Empujar la actualización a todos: los que tengan la app abierta se
  // actualizan en unos segundos, y los demás la próxima vez que la abran.
  // Inerte para quien ya está al día.
  const handleForceUpdate = async () => {
    if (currentBuild === null || isPushing) return;

    try {
      setIsPushing(true);

      const { status, data } = await apiSetForceUpdate(currentBuild);

      if (status !== 200) {
        throw new Error(data?.message || 'error_app_generic-desc');
      }

      displaySnackNotification({
        header: 'Actualización enviada',
        message:
          'Los dispositivos que tengan la app abierta se actualizarán en unos segundos; el resto, la próxima vez que la abran.',
        severity: 'success',
      });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: 'No se pudo enviar',
        message: 'Inténtalo de nuevo en un momento.',
        severity: 'error',
      });
    } finally {
      setIsPushing(false);
    }
  };

  return {
    rows,
    visibleRows,
    needAttention,
    outdatedCount,
    currentBuild,
    showAll,
    setShowAll,
    handleForceUpdate,
    isPushing,
  };
};

export default useDevicesStatus;
