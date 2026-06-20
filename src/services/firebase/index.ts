import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  getFirestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECTID,
  appId: import.meta.env.VITE_FIREBASE_APPID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGINGSENDERID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGEBUCKET || 'elda-centro-app.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);

// Persistent local cache: territories (and anything else on Firestore)
// paints from the last-known snapshot immediately on launch instead of
// waiting on the network, then revalidates in the background — the same
// "feels instant" behavior the rest of the app gets from Dexie.
// Single-tab manager: this app doesn't need multi-tab synced cache, and it
// avoids the extra IndexedDB coordination overhead multi-tab mode adds.
// Falls back to the plain (non-persistent) client if init fails for any
// reason (e.g. a browser without IndexedDB support) — better to work
// without the cache than to fail to start.
export const firestore = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({}),
      }),
    });
  } catch {
    return getFirestore(app);
  }
})();

if (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) {
  connectAuthEmulator(
    getAuth(),
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST,
    { disableWarnings: true }
  );
}
