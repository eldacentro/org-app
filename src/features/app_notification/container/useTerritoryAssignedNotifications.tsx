import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { notificationsState } from '@states/notification';
import { territoryNoticesState } from '@states/territories';
import { myUnreadNoticesState } from '@states/territories';
import { TerritoryAssignedNotificationType } from '@definition/notification';
import { subscribeNotices } from '@services/firebase/territories';
import { congIDState } from '@states/settings';

const useTerritoryAssignedNotifications = () => {
  const setNotifications = useSetAtom(notificationsState);
  const unreadNotices = useAtomValue(myUnreadNoticesState);
  const setNotices = useSetAtom(territoryNoticesState);
  const congId = useAtomValue(congIDState);

  useEffect(() => {
    if (!congId) return;
    const unsub = subscribeNotices(congId, setNotices);
    return () => unsub();
  }, [congId, setNotices]);

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
      const newNotifications: TerritoryAssignedNotificationType[] = unreadNotices.map((notice) => {
        const isRequest = notice.title?.toLowerCase().includes('solicitud') || notice.mensaje.toLowerCase().includes('solicitó');
        const isReturn = notice.title?.toLowerCase().includes('devuelto') || notice.mensaje.toLowerCase().includes('devolvió');
        return {
          id: `territory-assigned-${notice.id}`,
          title: notice.title || 'Aviso de territorio',
          description: notice.mensaje,
          date: notice.createdAt,
          icon: isRequest || isReturn ? 'territory-requests' : 'territory-assigned',
          notice: notice,
          enableRead: false,
          read: false,
        };
      });

      newValue = [...newValue, ...newNotifications];
      return newValue;
    });
  }, [unreadNotices, setNotifications]);
};

export default useTerritoryAssignedNotifications;
