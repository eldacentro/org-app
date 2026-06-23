import Dexie from 'dexie';
import appDb from '@db/appDb';

const RECOVERY_FLAG = 'db_auto_recovered';

/**
 * The local Dexie database ("organized") is only an encrypted CACHE of data
 * that lives on the server and fully re-syncs. But if it fails to OPEN, the
 * whole app hangs forever on the loading logo: the useLiveQuery in
 * useIndexedDb never resolves, so isSettingsReady/isDbReady never flip true,
 * and a reload doesn't help because the broken DB is reopened every time —
 * only clearing browser data fixed it, which no regular user knows how to do.
 *
 * The classic cause is a Dexie VersionError: the device's IndexedDB schema is
 * NEWER than the running code expects. In a PWA this happens with any bundle/
 * schema version skew — a service worker briefly serving an older cached
 * bundle after the user already upgraded, a rollback, or a staged deploy. It's
 * permanent until the DB is deleted, and 100% safe to recover from: the device
 * previously ran that newer version, which already pushed its data to the
 * server, so deleting the local copy loses nothing — it re-downloads on the
 * next sync.
 *
 * So on VersionError we delete the DB and reload automatically, invisibly
 * fixing what used to be a permanent brick. A one-shot session flag guards the
 * (theoretically impossible) repeat from becoming a reload loop; anything else
 * falls through to the startup watchdog, which surfaces a one-tap repair screen
 * instead of hanging.
 */
export const initDbWithRecovery = async () => {
  try {
    await appDb.open();
  } catch (error) {
    const name = (error as Error)?.name;
    const alreadyRecovered = sessionStorage.getItem(RECOVERY_FLAG) === 'true';

    if (name === 'VersionError' && !alreadyRecovered) {
      sessionStorage.setItem(RECOVERY_FLAG, 'true');

      try {
        appDb.close();
        await Dexie.delete('organized');
      } catch {
        // Ignore — the reload retries a fresh open regardless.
      }

      window.location.reload();
    }
  }
};
