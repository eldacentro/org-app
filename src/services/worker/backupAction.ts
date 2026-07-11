import { delay } from '@utils/common';
import {
  apiGetCongregationBackup,
  apiGetPocketBackup,
  apiSendCongregationBackup,
  apiSendPocketBackup,
} from './backupApi';
import {
  dbClearExportState,
  dbExportDataBackup,
  dbGetMetadata,
  dbGetSettings,
} from './backupUtils';

declare const self: MyWorkerGlobalScope;

self.setting = {
  apiHost: undefined,
  userID: undefined,
  idToken: undefined,
  FEATURE_FLAGS: {},
};

// Debounce + concurrency guard for backup runs.
//
// Problem: every Dexie write fires startWorker immediately. Rapid edits (e.g.
// filling a form on the Exhibitors page) would launch a new full GET→merge→POST
// cycle for each keystroke, causing 409 conflicts and BACKUP_FAILED toasts.
//
// Solution: debounce startWorker calls by 3 s. If a backup is already running
// when new changes arrive, coalesce them into a single pending run that starts
// after the current one finishes (also debounced by 1 s to avoid back-to-back
// cycles that would collide on the server uploadId guard).
const DEBOUNCE_MS = 3000;
const PENDING_DEBOUNCE_MS = 1000;

let isBackupRunning = false;
let pendingBackup = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

self.onmessage = function (event) {
  if (event.data.field) {
    if (Object.keys(self.setting).includes(event.data.field)) {
      self.setting[event.data.field] = event.data.value;
    }
  }

  if (event.data === 'startWorker') {
    if (isBackupRunning) {
      pendingBackup = true;
      return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runBackup, DEBOUNCE_MS);
  }
};

const runBackup = async () => {
  isBackupRunning = true;
  let backup = '';

  try {
    const { apiHost, userID, idToken } = self.setting;

    const settings = await dbGetSettings();
    const accountType = settings?.user_settings?.account_type;

    console.log('[backup] runBackup — accountType:', accountType, '| hasIdToken:', !!idToken, '| hasUserID:', !!userID);

    if (accountType === 'vip' && idToken && idToken.length > 0 && userID && userID.length > 0) {
      backup = 'started';
      self.postMessage('Syncing');

      // loop until server responds backup completed excluding failure after 3 retries
      let retry = 1;

      do {
        console.log('[backup] VIP retry', retry);
        const syncStart = performance.now();

        const metadata = await dbGetMetadata();

        const backupData = await apiGetCongregationBackup({
          apiHost,
          userID,
          idToken,
          metadata: JSON.stringify(metadata),
        });

        const exportStart = performance.now();
        const reqPayload = await dbExportDataBackup(backupData);
        console.log(`[backup] export/merge local en ${Math.round(performance.now() - exportStart)}ms`);

        // Nada local que subir (payload {}): este ciclo fue SOLO de descarga
        // — lo disparó la señal de otro dispositivo. El GET de arriba ya trajo
        // y fusionó lo nuevo, así que el POST sobra. Evitarlo es lo correcto y
        // además esquiva el conflicto inútil (y el falso BACKUP_FAILED) cuando
        // otro está subiendo a la vez: no tenemos nada que aportar, así que un
        // 409 no significa nada para nosotros.
        if (Object.keys(reqPayload).length === 0) {
          console.log('[backup] nada que subir — ciclo solo de descarga, completado');
          backup = 'completed';
          break;
        }

        const metadataUpdate = await dbGetMetadata();

        const data = await apiSendCongregationBackup({
          apiHost,
          userID,
          reqPayload,
          idToken,
          metadata: metadataUpdate,
        });

        console.log(
          `[backup] POST response: ${data.message} — sync completo en ${Math.round(performance.now() - syncStart)}ms`
        );

        if (data.message === 'UNAUTHORIZED_REQUEST') {
          backup = 'failed';
          self.postMessage({
            error: 'BACKUP_FAILED',
            details: 'UNAUTHORIZED_ACCESS',
          });
        }

        if (data.message === 'error_api_internal-error') {
          backup = 'failed';
          self.postMessage({ error: 'BACKUP_FAILED', details: data.message });
        }

        if (data.message === 'BACKUP_SENT') {
          backup = 'completed';
        }

        // Un sync-conflict solo significa "otro dispositivo acaba de subir o
        // está subiendo ahora mismo" — con el sync instantáneo estos choques
        // son normales (todos reaccionan a la vez a la señal). El ciclo
        // siguiente re-descarga y fusiona lo del otro, así que reintentar
        // PRONTO es seguro y correcto: 2-4 s con jitter (para no chocar de
        // nuevo en el mismo instante), hasta 5 intentos. Los 10 s solo quedan
        // para errores de verdad (fallo del servidor, etc.).
        if (backup === 'started') {
          const isConflict = data.message === 'error_api_sync-conflict';
          const maxRetries = isConflict ? 5 : 3;

          if (retry < maxRetries) {
            const wait = isConflict ? 2000 + Math.random() * 2000 : 10000;
            console.log(
              `[backup] reintentando en ${Math.round(wait / 1000)}s — respuesta:`,
              data.message
            );
            await delay(wait);
          } else {
            backup = 'failed';
            self.postMessage({ error: 'BACKUP_FAILED', details: data.message });
          }
        }

        retry++;
      } while (backup === 'started');
    }

    if (accountType === 'pocket') {
      backup = 'started';
      self.postMessage('Syncing');

      // loop until server responds backup completed excluding failure after 3 retries
      let retry = 1;

      do {
        const metadata = await dbGetMetadata();

        const backupData = await apiGetPocketBackup({
          apiHost,
          metadata: JSON.stringify(metadata),
        });

        const reqPayload = await dbExportDataBackup(backupData);

        // ciclo solo de descarga: nada que subir → sin POST (ver bucle VIP)
        if (Object.keys(reqPayload).length === 0) {
          backup = 'completed';
          break;
        }

        const metadataUpdate = await dbGetMetadata();

        const data = await apiSendPocketBackup({
          apiHost,
          reqPayload,
          metadata: JSON.stringify(metadataUpdate),
        });

        if (data.message === 'UNAUTHORIZED_REQUEST') {
          backup = 'failed';
          self.postMessage({
            error: 'BACKUP_FAILED',
            details: 'UNAUTHORIZED_ACCESS',
          });
        }

        if (data.message === 'error_api_internal-error') {
          backup = 'failed';
          self.postMessage({ error: 'BACKUP_FAILED', details: data.message });
        }

        if (data.message === 'BACKUP_SENT') {
          backup = 'completed';
        }

        // misma política que el bucle VIP: conflictos = reintento corto
        if (backup === 'started') {
          const isConflict = data.message === 'error_api_sync-conflict';
          const maxRetries = isConflict ? 5 : 3;

          if (retry < maxRetries) {
            await delay(isConflict ? 2000 + Math.random() * 2000 : 10000);
          } else {
            backup = 'failed';
            self.postMessage({ error: 'BACKUP_FAILED', details: data.message });
          }
        }

        retry++;
      } while (backup === 'started');
    }

    if (backup === 'completed') {
      await dbClearExportState();

      self.postMessage('Done');
      self.postMessage({ lastBackup: new Date().toISOString() });
    }
  } catch (error) {
    console.error(error);
    backup = 'failed';
    self.postMessage({ error: 'BACKUP_FAILED', details: error.message });
  } finally {
    isBackupRunning = false;
    if (pendingBackup) {
      pendingBackup = false;
      debounceTimer = setTimeout(runBackup, PENDING_DEBOUNCE_MS);
    }
  }
};
