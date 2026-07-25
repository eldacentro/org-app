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
      const newNotifications: TerritoryAssignedNotificationType[] = unreadNotices.map((notice) => ({
        id: `territory-assigned-${notice.id}`,
        title: notice.title || 'Aviso de territorio',
        description: notice.mensaje,
        date: notice.createdAt,
        // El icono decide además si se pinta el botón "Ver Territorio"
        // (ver notification_item), así que se elige por un dato REAL: si el
        // aviso apunta a un territorio concreto, hay adónde ir; si no (p. ej.
        // una asignación en lote de varios territorios), no.
        //
        // Antes se adivinaba buscando las palabras "solicitud"/"solicitó"/
        // "devuelto"/"devolvió" DENTRO del mensaje. Como el texto del aviso
        // de territorio atrasado lo escribe el responsable en Configuración,
        // bastaba que pusiera "…o si lo devolvió sin trabajar" para que el
        // aviso perdiera su botón y el publicador se quedara sin acceso
        // directo al territorio.
        icon: notice.territoryId ? 'territory-assigned' : 'territory-requests',
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
