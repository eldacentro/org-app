import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  Messaging,
  onMessage,
} from 'firebase/messaging';
import logger from '@services/logger/index';

/**
 * Phase 0 — FCM web push plumbing (frontend).
 *
 * Only the token lifecycle lives here: feature-detect support, request the
 * browser permission, obtain/refresh the FCM token against the dedicated
 * service worker, and surface foreground messages. The "what triggers a push"
 * logic (assignment diff + batching) is added in later phases — and, because
 * schedules are end-to-end encrypted, that detection runs on the client.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// public Firebase web config (already shipped in the client bundle) forwarded to
// the static service worker via query string so it works across environments
// without hardcoding values into the SW file.
const swConfigParams = () =>
  new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_APIKEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTHDOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECTID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APPID ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGINGSENDERID ?? '',
  }).toString();

let messagingInstance: Messaging | null = null;

/**
 * Returns whether web push can work in the current browser. Note: on iOS this
 * is only true when the PWA is installed to the home screen (Safari >= 16.4).
 */
export const isPushSupported = async (): Promise<boolean> => {
  try {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!VAPID_KEY &&
      (await isSupported())
    );
  } catch {
    return false;
  }
};

const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (!(await isPushSupported())) return null;
  if (!messagingInstance) messagingInstance = getMessaging();
  return messagingInstance;
};

/**
 * Resolves once the registration has an *active* service worker. `getToken`
 * needs an active SW (PushManager.subscribe fails with AbortError otherwise),
 * and a freshly registered worker starts in `installing`/`waiting`.
 * A 6-second timeout prevents hanging on iOS if `statechange` never fires.
 */
const waitForActiveSW = (
  registration: ServiceWorkerRegistration
): Promise<void> => {
  if (registration.active) return Promise.resolve();

  const worker = registration.installing || registration.waiting;
  if (!worker) return Promise.resolve();

  return new Promise((resolve) => {
    // Fallback: proceed after timeout even if activation stalls (e.g. iOS edge cases)
    const timer = setTimeout(resolve, 6000);

    const onStateChange = () => {
      if (worker.state === 'activated') {
        clearTimeout(timer);
        worker.removeEventListener('statechange', onStateChange);
        resolve();
      }
    };
    worker.addEventListener('statechange', onStateChange);
  });
};

/**
 * Registers the dedicated FCM service worker (separate from the Workbox
 * `service-worker.js`, so the two never collide) and waits for it to activate.
 */
const registerMessagingSW =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${swConfigParams()}`,
        { scope: '/firebase-cloud-messaging-push-scope' }
      );

      await waitForActiveSW(registration);

      return registration;
    } catch (error) {
      logger.error('push', `failed to register messaging SW: ${error}`);
      return null;
    }
  };

/**
 * Requests notification permission (if not already decided) and returns the FCM
 * registration token, or null if unsupported/denied/failed.
 *
 * Permission is requested FIRST — before any other async work — so that iOS
 * Safari does not lose the user-gesture context across multiple awaits.
 */
export const requestPushToken = async (): Promise<string | null> => {
  if (Notification.permission === 'denied') return null;

  // iOS requires requestPermission to be the very first async call after the
  // user gesture. Do it before getMessagingInstance / registerMessagingSW.
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await registerMessagingSW();
  if (!registration) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (error) {
    logger.error('push', `failed to get FCM token: ${error}`);
    return null;
  }
};

/**
 * Revokes the current FCM token (used on logout / when the user opts out).
 */
export const revokePushToken = async (): Promise<void> => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  try {
    await deleteToken(messaging);
  } catch (error) {
    logger.error('push', `failed to delete FCM token: ${error}`);
  }
};

/**
 * Subscribes to foreground messages (when the app/tab is focused). Returns an
 * unsubscribe function. Background messages are handled by the SW instead.
 */
export const onForegroundPush = async (
  handler: (payload: unknown) => void
): Promise<() => void> => {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, handler);
};
