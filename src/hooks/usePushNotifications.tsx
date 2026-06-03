import { useCallback, useEffect, useState } from 'react';
import {
  isPushSupported,
  requestPushToken,
  revokePushToken,
} from '@services/firebase/messaging';
import { apiDeletePushToken, apiRegisterPushToken } from '@services/api/user';
import logger from '@services/logger/index';

/**
 * Phase 0 — push notification opt-in plumbing.
 *
 * Exposes the current support/permission state plus `enablePush` / `disablePush`
 * for a settings toggle to call. Enabling requests the browser permission,
 * obtains the FCM token, and registers it with the backend (per device/session).
 * Disabling revokes the token locally and on the backend.
 *
 * This hook does NOT decide when pushes are sent — that logic (assignment diff +
 * batching, client-side because schedules are E2E encrypted) lands in a later
 * phase.
 */
const usePushNotifications = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isPushSupported().then(setSupported);
  }, []);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (busy) return false;

    setBusy(true);

    try {
      const token = await requestPushToken();

      setPermission(
        typeof Notification !== 'undefined'
          ? Notification.permission
          : 'default'
      );

      if (!token) return false;

      const { status } = await apiRegisterPushToken(token);

      if (status !== 200) {
        logger.error('push', `backend rejected push token (status ${status})`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('push', `failed to enable push: ${error}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const disablePush = useCallback(async (): Promise<void> => {
    if (busy) return;

    setBusy(true);

    try {
      await apiDeletePushToken();
      await revokePushToken();
    } catch (error) {
      logger.error('push', `failed to disable push: ${error}`);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return {
    supported,
    permission,
    busy,
    enabled: supported && permission === 'granted',
    enablePush,
    disablePush,
  };
};

export default usePushNotifications;
