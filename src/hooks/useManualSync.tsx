import { useAtomValue, useSetAtom } from 'jotai';
import {
  congAccountConnectedState,
  isAppDataSyncingState,
  lastAppDataSyncState,
} from '@states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { dbMetadataReset } from '@services/dexie/metadata';
import worker from '@services/worker/backupWorker';
import useAppTranslation from './useAppTranslation';
import useCurrentUser from './useCurrentUser';
import useFirebaseAuth from './useFirebaseAuth';

/**
 * Shared manual-sync trigger and status text. Reused by the settings
 * dashboard card and the navbar account menu so both stay in sync with a
 * single source of truth instead of duplicating the backup-worker logic.
 */
const useManualSync = () => {
  const { t } = useAppTranslation();

  const { user } = useFirebaseAuth();
  const { accountType } = useCurrentUser();

  const isSyncing = useAtomValue(isAppDataSyncingState);
  const setIsSyncing = useSetAtom(isAppDataSyncingState);
  const lastSync = useAtomValue(lastAppDataSyncState);
  const isConnected = useAtomValue(congAccountConnectedState);

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

  const triggerSync = async () => {
    // Optimistic feedback — show "Sincronizando" immediately without waiting
    // for the worker's 3-second debounce to fire.
    setIsSyncing(true);

    try {
      if (accountType === 'vip' && user) {
        const idToken = await user.getIdToken(true);
        worker.postMessage({ field: 'idToken', value: idToken });
      }
    } catch {
      // Non-critical — worker will use its cached token
    }

    worker.postMessage('startWorker');
  };

  // Sincronización normal (el botón "Sincronizar datos"): sube lo pendiente y
  // baja lo nuevo, en un ciclo ligero de segundos. NO resetea el índice de
  // versiones, así que no re-descarga toda la congregación — que es justo lo
  // que la gente NO necesita cuando pulsa "por si acaso". Con el sync
  // instantáneo, sus cambios ya se suben solos; esto es la confirmación
  // manual rápida.
  const handleManualSync = () => triggerSync();

  // Re-descarga completa (herramienta de recuperación, en "Acerca de"): borra
  // el índice de versiones para que el servidor reenvíe TODA la información y
  // se vuelva a fusionar con lo local. Pesado (puede tardar) — solo para
  // cuando algo no se ve bien. Ver dbMetadataReset.
  const handleFullResync = async () => {
    try {
      await dbMetadataReset();
    } catch {
      // si falla el reset, el ciclo normal de abajo aún sincroniza lo pendiente
    }

    await triggerSync();
  };

  // "al día" confirmado: acaba de sincronizar (≤1 min) y sin ciclo en curso —
  // lo usa el menú para pintar el icono en verde como confirmación visual
  const isUpToDate =
    !isSyncing && (lastSync === 'now' || lastSync === 'recently');

  return {
    isSyncing,
    isConnected,
    isUpToDate,
    secondaryText: getSecondaryText(),
    handleManualSync,
    handleFullResync,
  };
};

export default useManualSync;
