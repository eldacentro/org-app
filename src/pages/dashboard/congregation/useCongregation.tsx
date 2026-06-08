import { useEffect, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import {
  congAccountConnectedState,
  isAppDataSyncingState,
  lastAppDataSyncState,
} from '@states/app';
import {
  useAppTranslation,
  useCurrentUser,
  useFirebaseAuth,
} from '@hooks/index';
import { getMessageByCode } from '@services/i18n/translation';
import { adminRoleState } from '@states/settings';
import { joinRequestsCountState } from '@states/congregation';
import { dbMetadataReset } from '@services/dexie/metadata';
import worker from '@services/worker/backupWorker';

const useCongregation = () => {
  const { t } = useAppTranslation();

  const { user } = useFirebaseAuth();

  const { accountType } = useCurrentUser();

  const isSyncing = useAtomValue(isAppDataSyncingState);
  const lastSync = useAtomValue(lastAppDataSyncState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const isUserAdmin = useAtomValue(adminRoleState);
  const joinRequestsCount = useAtomValue(joinRequestsCountState);

  const requests_count = useMemo(() => {
    if (joinRequestsCount === 0) return;

    return joinRequestsCount.toString();
  }, [joinRequestsCount]);

  const getSecondaryText = () => {
    if (isSyncing) return t('tr_syncAppDataInProgress');

    if (lastSync === 'now') return t('tr_lastSyncAppDataNow');
    if (lastSync === 'recently') return t('tr_lastSyncAppDataRecently');
    if (lastSync === 'error') return getMessageByCode('error_app_generic-title');
    if (typeof lastSync === 'number' && lastSync >= 1) {
      return t('tr_lastSyncAppData', { duration: lastSync });
    }

    // lastSync === 0 or '' means no sync has completed yet — show nothing
    return '';
  };

  const handleManualSync = async () => {
    await dbMetadataReset();

    if (accountType === 'vip') {
      worker.postMessage({
        field: 'idToken',
        value: await user.getIdToken(true),
      });
    }

    worker.postMessage('startWorker');
  };

  useEffect(() => {
    if (isConnected) {
      const svgIcon = document.querySelector<SVGElement>('.organized-sync-icon');
      if (svgIcon) {
        const g = svgIcon.querySelector('g');
        const checkMark = g.querySelector('path');
        checkMark.style.animation = 'fade-out 0s ease-in-out forwards';
      }
    }
  }, [isConnected]);

  useEffect(() => {
    if (isSyncing) {
      const svgIcon = document.querySelector<SVGElement>(
        '.organized-sync-icon'
      );
      if (svgIcon) {
        const g = svgIcon.querySelector('g');
        const checkMark = g.querySelector('path');

        checkMark.style.animation = 'fade-out 0s ease-in-out forwards';
        svgIcon.style.animation = 'rotate 2s linear infinite';
      }
    }
  }, [isSyncing]);

  useEffect(() => {
    if (!isSyncing && isConnected) {
      const svgIcon = document.querySelector<SVGElement>(
        '.organized-sync-icon'
      );
      if (svgIcon) {
        const g = svgIcon.querySelector('g');
        const checkMark = g.querySelector('path');

        svgIcon.style.animation = '';
        checkMark.style.animation = 'fade-in 0.25s ease-in-out forwards';
      }
    }
  }, [isSyncing, isConnected]);

  return {
    secondaryText: getSecondaryText(),
    handleManualSync,
    isConnected,
    isUserAdmin,
    requests_count,
  };
};

export default useCongregation;
