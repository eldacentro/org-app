import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { notificationsState } from '@states/notification';
import { territoryPendingRequestsState } from '@states/territories';
import { StandardNotificationType } from '@definition/notification';

const useTerritoryRequestsNotifications = () => {
  const setNotifications = useSetAtom(notificationsState);
  const pendingRequests = useAtomValue(territoryPendingRequestsState);

  useEffect(() => {
    if (pendingRequests.length > 0) {
      const lastUpdated = pendingRequests.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      )[pendingRequests.length - 1].createdAt;

      const requestNotification: StandardNotificationType = {
        id: 'territory-requests',
        title: 'Solicitudes de territorio',
        description: `Hay ${pendingRequests.length} solicitud(es) de territorio pendiente(s) de atender. Ve a la sección [Territorios](/territories) para gestionarlas.`,
        date: lastUpdated,
        icon: 'standard',
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
  }, [pendingRequests, setNotifications]);
};

export default useTerritoryRequestsNotifications;
