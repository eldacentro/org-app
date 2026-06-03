/* eslint-disable no-undef */

/**
 * Dedicated Firebase Cloud Messaging service worker.
 *
 * Independent from the Workbox-generated `service-worker.js` (different scope,
 * never collide). Its job: receive background push, show the notification, and
 * route taps back into the app.
 *
 * The public Firebase web config is passed in via query string by
 * `src/services/firebase/messaging.ts`, so this static file works across
 * environments without hardcoded values.
 *
 * Phase 0 note: payloads are generic here. Specific, batched assignment
 * notifications ("Se te asignaron N cosas") arrive in a later phase — and,
 * because schedules are E2E encrypted, that composition happens client-side.
 */

try {
  importScripts(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'
  );
  importScripts(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'
  );

  // Rewrap incoming push events: move the `notification` key into `data` so the
  // browser does not auto-display a second notification on top of ours (dedupe).
  class CustomPushEvent extends Event {
    constructor(data) {
      super('push');

      Object.assign(this, data);
      this.custom = true;
    }
  }

  self.addEventListener('push', (e) => {
    // Skip if event is our own custom event
    if (e.custom) return;

    // Keep old event data to override
    const oldData = e.data;

    // Pull values from the notification key into data, then drop notification
    const newEvent = new CustomPushEvent({
      data: {
        json() {
          const newData = oldData.json();
          newData.data = {
            ...newData.data,
            ...newData.notification,
          };
          delete newData.notification;
          return newData;
        },
      },
      waitUntil: e.waitUntil.bind(e),
    });

    // Stop event propagation
    e.stopImmediatePropagation();

    // Dispatch the new wrapped event
    dispatchEvent(newEvent);
  });

  // Real public web config, forwarded from the app via query string.
  const params = new URL(self.location).searchParams;
  const firebaseConfig = {
    apiKey: params.get('apiKey'),
    authDomain: params.get('authDomain'),
    projectId: params.get('projectId'),
    appId: params.get('appId'),
    messagingSenderId: params.get('messagingSenderId'),
  };

  if (firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Listens for background notifications
    messaging.onBackgroundMessage((payload) => {
      const data = payload.data || {};

      const notificationTitle = data.title || 'Elda Centro';
      const notificationOptions = {
        body: data.body || '',
        icon: data.image || '/img/icon/icon-192x192.png',
        badge: '/img/icon/icon-monochrome-192x192.png',
        // `tag` lets later batched notifications collapse onto one another
        tag: data.tag || undefined,
        data: { url: data.url || '/', ...data },
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }

  // Focus an existing window (or open one) and route to the target URL on tap.
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl =
      (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) {
              client.focus();
              if ('navigate' in client) client.navigate(targetUrl);
              return;
            }
          }
          if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
  });
} catch (error) {
  console.error(error);
}
