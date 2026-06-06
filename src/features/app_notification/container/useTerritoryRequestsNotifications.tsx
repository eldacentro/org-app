import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { notificationsState } from '@states/notification';
import { territoryPendingRequestsState } from '@states/territories';
import { TerritoryRequestNotificationType } from '@definition/notification';
import { useIsTerritoryManager } from '@features/territories/useIsTerritoryManager';

const useTerritoryRequestsNotifications = () => {
  const setNotifications = useSetAtom(notificationsState);
  const pendingRequests = useAtomValue(territoryPendingRequestsState);
  const isManager = useIsTerritoryManager();

  useEffect(() => {
    // Solo mostrar esta notificación a los responsables de territorios
    if (!isManager) {
      setNotifications((prev) => prev.filter((record) => record.id !== 'territory-requests'));
      return;
    }

    if (pendingRequests.length > 0) {
      const lastUpdated = pendingRequests.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      )[pendingRequests.length - 1].createdAt;

      const count = pendingRequests.length;
      const requestNotification: TerritoryRequestNotificationType = {
        id: 'territory-requests',
        title: 'Solicitudes de territorio',
        description: `Hay ${count} solicitud${count === 1 ? '' : 'es'} de territorio pendiente${count === 1 ? '' : 's'} de atender.`,
        date: lastUpdated,
        icon: 'territory-requests',
        requests: pendingRequests,
        enableRead: false,
        read: false,
      };

      setNotifications((prev) => {
        const newValue = prev.filter((record) => record.id !== 'territory-requests');
        newValue.push(requestNotification);
        return newValue;
      });
    } else {
      setNotifications((prev) => prev.filter((record) => record.id !== 'territory-requests'));
    }
  }, [pendingRequests, setNotifications, isManager]);
};

export default useTerritoryRequestsNotifications;
