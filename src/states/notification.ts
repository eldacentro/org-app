import { atom } from 'jotai';
import {
  NotificationDbRecordType,
  NotificationRecordType,
} from '@definition/notification';
import { getSeenApplications } from '@services/app/applications_seen';

export const notificationsDbState = atom<NotificationDbRecordType[]>([]);

export const notificationsState = atom<NotificationRecordType[]>([]);

export const countNotificationsState = atom((get) => {
  const notifications = get(notificationsState);
  return notifications.length;
});

/**
 * Las solicitudes de precursor auxiliar que ya se han abierto en este
 * dispositivo. Arranca de localStorage (para que abrir una no la resucite al
 * recargar) y es un átomo para que el aviso desaparezca en el momento, sin
 * esperar al siguiente ciclo de sincronización.
 */
export const applicationsSeenState = atom<string[]>(getSeenApplications());
