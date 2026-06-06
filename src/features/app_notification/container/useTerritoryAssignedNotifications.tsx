import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { notificationsState } from '@states/notification';
import { myUnreadNoticesState } from '@states/territories';
import { TerritoryAssignedNotificationType } from '@definition/notification';

const useTerritoryAssignedNotifications = () => {
  const setNotifications = useSetAtom(notificationsState);
  const unreadNotices = useAtomValue(myUnreadNoticesState);

  useEffect(() => {
    // Si no hay notificaciones, borrar las existentes de territory-assigned
    if (unreadNotices.length === 0) {
      setNotifications((prev) => prev.filter((record) => !record.id.startsWith('territory-assigned-')));
      return;
    }

    setNotifications((prev) => {
      // Remover las viejas notificaciones de este tipo
      let newValue = prev.filter((record) => !record.id.startsWith('territory-assigned-'));

      // Crear una notificación por cada aviso
      const newNotifications: TerritoryAssignedNotificationType[] = unreadNotices.map((notice) => ({
        id: `territory-assigned-${notice.id}`,
        title: 'Nuevo territorio asignado',
        description: notice.mensaje,
        date: notice.createdAt,
        icon: 'territory-assigned',
        notice: notice,
        enableRead: false,
        read: false,
      }));

      newValue = [...newValue, ...newNotifications];
      return newValue;
    });
  }, [unreadNotices, setNotifications]);
};

export default useTerritoryAssignedNotifications;
