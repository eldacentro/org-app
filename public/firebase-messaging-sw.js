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
    'https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js'
  );
  importScripts(
    'https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js'
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

    // Listens for background notifications (app closed / not focused).
    // For assignment-update pushes we read the pending_push table that the app
    // wrote the last time it was open and synced, so the notification is
    // specific ("Se te asignaron N cosas") rather than generic.
    messaging.onBackgroundMessage((payload) => {
      const data = payload.data || {};

      // Try to read from the local IndexedDB pending_push table first.
      // Fall back to the payload content (or a generic message) if unavailable.
      self.event = self.event || {};

      const showWithContent = (title, body, url) => {
        self.registration.showNotification(title, {
          body: body || '',
          icon: '/img/icon/icon-192x192.png',
          badge: '/img/icon/icon-monochrome-192x192.png',
          tag: 'assignment-update',
          data: { url: url || '/' },
        });
      };

      const openIndexedDb = () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('organized');
          req.onsuccess = (e) => resolve(e.target.result);
          req.onerror = () => reject(req.error);
        });

      const readPendingPush = (db) =>
        new Promise((resolve) => {
          try {
            const tx = db.transaction('pending_push', 'readwrite');
            const store = tx.objectStore('pending_push');
            const idx = store.index('shown');
            const req = idx.getAll(IDBKeyRange.only(0)); // shown = 0
            req.onsuccess = () => {
              const records = req.result || [];
              if (records.length === 0) {
                resolve(null);
                return;
              }
              // Pick the most recent unshown record
              records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              const record = records[0];

              // Mark all unshown records as shown
              for (const r of records) {
                store.put({ ...r, shown: 1 });
              }

              tx.oncomplete = () => resolve(record);
              tx.onerror = () => resolve(record);
            };
            req.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });

      const run = async () => {
        try {
          const db = await openIndexedDb();
          const record = await readPendingPush(db);
          db.close();

          if (record && record.title) {
            showWithContent(record.title, record.body, record.url);
          } else {
            // Generic fallback: data from payload or default message
            showWithContent(
              data.title || 'Tienes novedades',
              data.body || 'Abre la app para ver tus asignaciones.',
              data.url || '/'
            );
          }
        } catch {
          showWithContent(
            data.title || 'Tienes novedades',
            data.body || 'Abre la app para ver tus asignaciones.',
            data.url || '/'
          );
        }
      };

      // event.waitUntil keeps the SW alive until the promise resolves
      self.registration.active && run();
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
