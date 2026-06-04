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
 * `enabled` reflects whether push is actually active on THIS device (a persisted
 * opt-in flag), not merely whether the browser permission is granted — otherwise
 * the toggle could never be switched off, since revoking a token doesn't reset
 * `Notification.permission`.
 *
 * This hook does NOT decide when pushes are sent — that logic (assignment diff +
 * batching, client-side because schedules are E2E encrypted) lands in a later
 * phase.
 */
const OPT_IN_KEY = 'organized_push-enabled';

const readOptIn = () => {
  try {
    return localStorage.getItem(OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeOptIn = (value: boolean) => {
  try {
    localStorage.setItem(OPT_IN_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore storage failures */
  }
};

const usePushNotifications = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [optedIn, setOptedIn] = useState(readOptIn);
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

      writeOptIn(true);
      setOptedIn(true);
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

    // Reflect the user's intent immediately; the token cleanup is best-effort.
    writeOptIn(false);
    setOptedIn(false);

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
    enabled: supported && permission === 'granted' && optedIn,
    enablePush,
    disablePush,
  };
};

export default usePushNotifications;
