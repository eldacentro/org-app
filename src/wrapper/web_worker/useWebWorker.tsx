import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  displaySnackNotification,
  setLastAppDataSync,
} from '@services/states/app';
import { isTest, LANGUAGE_LIST } from '@constants/index';
import {
  congAccountConnectedState,
  isAppDataSyncingState,
  isOnlineState,
} from '@states/app';
import {
  backupAutoState,
  backupIntervalState,
  JWLangState,
} from '@states/settings';
import { useCurrentUser, useFirebaseAuth } from '@hooks/index';
import { schedulesBuildHistoryList } from '@services/app/schedules';
import { setAssignmentsHistory } from '@services/states/schedules';
import { refreshLocalesResources } from '@services/i18n';
import { getMessageByCode } from '@services/i18n/translation';
import { dbPublicTalkUpdate } from '@services/dexie/public_talk';
import { dbSongUpdate } from '@services/dexie/songs';
import { dbAssignmentUpdate } from '@services/dexie/assignment';
import { dbWeekTypeUpdate } from '@services/dexie/weekType';
import { dbSpeakersCongregationsSetName } from '@services/dexie/speakers_congregations';
import logger from '@services/logger';
import worker from '@services/worker/backupWorker';
import { checkAndQueueAssignmentPush } from '@services/push/diff';
import { useLiveQuery } from 'dexie-react-hooks';
import appDb from '@db/appDb';
import { processPendingPublisherReports } from '@services/app/pending_publisher_reports';

const useWebWorker = () => {
  const location = useLocation();

  const { user } = useFirebaseAuth();

  const { isMeetingEditor } = useCurrentUser();

  const isSyncing = useAtomValue(isAppDataSyncingState);
  const setIsAppDataSyncing = useSetAtom(isAppDataSyncingState);

  const isPendingSync = useLiveQuery(async () => {
    const metadata = await appDb.metadata.get(1);
    if (!metadata) return false;
    return Object.values(metadata.metadata).some((table) => table.send_local === true);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPendingSync || isSyncing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPendingSync, isSyncing]);

  const isOnline = useAtomValue(isOnlineState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const backupAuto = useAtomValue(backupAutoState);
  const backupInterval = useAtomValue(backupIntervalState);
  const jwLang = useAtomValue(JWLangState);

  const [lastBackup, setLastBackup] = useState('');
  const prevPathRef = useRef('');

  const backupEnabled = isOnline && isConnected && backupAuto;
  const interval = backupInterval * 60 * 1000;

  // Retry any publisher field service reports that couldn't be sent earlier
  // because of a connectivity problem, as soon as we're back online.
  useEffect(() => {
    if (isOnline) {
      processPendingPublisherReports().catch(console.error);
    }
  }, [isOnline]);

  const sourceLang =
    LANGUAGE_LIST.find((record) => record.code.toUpperCase() === jwLang)
      ?.threeLettersCode || 'eng';

  useEffect(() => {
    if (!isTest && window.Worker) {
      worker.onmessage = async function (event) {
        if (event.data === 'Syncing') {
          setIsAppDataSyncing(true);
        }

        if (event.data === 'Done') {
          setIsAppDataSyncing(false);

          // sync complete -> refresh app data

          await refreshLocalesResources();
          await dbWeekTypeUpdate();
          await dbAssignmentUpdate();
          await dbPublicTalkUpdate();
          await dbSongUpdate();

          // load assignment history
          const history = schedulesBuildHistoryList();
          setAssignmentsHistory(history);

          await dbSpeakersCongregationsSetName();

          // check for new assignments and queue push notification
          checkAndQueueAssignmentPush().catch(() => {});
        }

        if (event.data.error === 'BACKUP_FAILED') {
          setIsAppDataSyncing(false);
          setLastBackup('error');

          const details = event.data.details ?? '';
          console.error('[sync] BACKUP_FAILED —', details || '(sin detalles)');

          // Always show an error so the user knows sync failed.
          // Use the translated message when available, otherwise show raw details.
          const translated = details.length > 0 ? getMessageByCode(details) : '';
          const message = translated && translated !== details
            ? `(${details}) ${translated}`
            : details || getMessageByCode('error_app_generic-title');

          displaySnackNotification({
            header: getMessageByCode('error_app_generic-title'),
            message,
            severity: 'error',
          });
        }

        if (event.data.lastBackup) {
          setLastBackup(event.data.lastBackup);
        }
      };
    }
  }, [isMeetingEditor, sourceLang, setIsAppDataSyncing]);

  // Trigger a one-time sync when first entering the persons section so receiving
  // devices always get fresh data before browsing or editing profiles.
  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = location.pathname;

    const enteringPersons =
      location.pathname.includes('/persons') &&
      !prevPath.includes('/persons');

    if (!enteringPersons || !backupEnabled || !user) return;

    const triggerSync = async () => {
      const idToken = await user.getIdToken(true);
      if (idToken?.length > 0) {
        worker.postMessage({ field: 'idToken', value: idToken });
      }
      worker.postMessage('startWorker');
    };

    triggerSync();
  }, [location.pathname, backupEnabled, user]);

  useEffect(() => {
    const runBackupTimer = setInterval(async () => {
      // Only pause the periodic timer on person DETAIL pages (when a person is
      // open for editing) to avoid overwriting unsaved changes. The persons LIST
      // page (/persons exactly) is allowed to sync so other devices receive
      // updates while browsing.
      const onPersonDetail = /\/persons\/.+/.test(location.pathname);
      if (onPersonDetail) {
        logger.info('app', 'synchronization paused - person detail open');
        return;
      }

      if (backupEnabled) {
        if (user) {
          const idToken = await user.getIdToken(true);

          if (idToken?.length > 0) {
            worker.postMessage({
              field: 'idToken',
              value: idToken,
            });
          }
        }

        worker.postMessage('startWorker');
      }

      // Also retry pending publisher reports here, not just on the isOnline
      // online/offline transition — a request can fail (timeout, dropped
      // packet) without navigator.onLine ever flipping, so the isOnline
      // effect alone would leave it stuck until the next real disconnect.
      if (isOnline) {
        processPendingPublisherReports().catch(console.error);
      }
    }, interval);

    return () => {
      clearInterval(runBackupTimer);
    };
  }, [backupEnabled, interval, user, location, isOnline]);

  useEffect(() => {
    const runCheckLastBackup = setInterval(() => {
      let result: string | number = 0;

      if (lastBackup.length === 0 || lastBackup === 'error') {
        result = lastBackup;
      }

      if (lastBackup.length > 0 && lastBackup !== 'error') {
        const lastDate = new Date(lastBackup).getTime();
        const currentDate = new Date().getTime();

        const msDifference = currentDate - lastDate;
        const resultS = Math.floor(msDifference / 1000);
        const resultM = Math.floor(resultS / 60);

        if (resultS <= 30) {
          result = 'now';
        }

        if (resultS > 30 && resultS < 60) {
          result = 'recently';
        }

        if (resultS >= 60) {
          result = resultM;
        }
      }

      setLastAppDataSync(result);
    }, 1000);

    return () => {
      clearInterval(runCheckLastBackup);
    };
  }, [lastBackup]);

  return {};
};

export default useWebWorker;
