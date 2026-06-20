import { decryptData, encryptObject } from '@services/encryption';
import {
  apiUserFieldServiceReportPost,
  apiValidateMe,
} from '@services/api/user';
import {
  apiPocketFieldServiceReportPost,
  apiPocketValidateMe,
} from '@services/api/pocket';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';

/**
 * Publishers (non-secretary/overseer) submit field service reports through a
 * direct backend call, not the regular Dexie→Firestore sync queue — there's
 * no other queue this could ride along on. On a flaky connection that call
 * used to just fail outright and the report was lost unless the person
 * remembered to resubmit. This is a small localStorage-backed queue (no
 * Dexie schema change, so no migration risk) that retries automatically
 * once the connection comes back.
 */

const STORAGE_KEY = 'pending_publisher_reports';

type PendingPublisherReport = {
  id: string;
  accountType: 'vip' | 'pocket';
  localAccessCode: string;
  // Plain (unencrypted) report — encryptObject mutates its input in place,
  // so each retry attempt re-encrypts a fresh clone of this, never the
  // already-(partially)-encrypted object from a previous attempt.
  report: Record<string, unknown>;
};

export const isNetworkError = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

  const err = error as Error;
  if (!err) return false;
  if (err.name === 'TypeError') return true; // fetch's own network-failure signature
  if (err.message?.includes('tardó demasiado')) return true; // our own apiFetch timeout

  return false;
};

const readQueue = (): PendingPublisherReport[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error reading pending publisher reports queue:', error);
    return [];
  }
};

const writeQueue = (queue: PendingPublisherReport[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const queuePendingPublisherReport = (
  entry: Omit<PendingPublisherReport, 'id'>
) => {
  const queue = readQueue();
  queue.push({ ...entry, id: crypto.randomUUID() });
  writeQueue(queue);
};

export const hasPendingPublisherReports = (): boolean => readQueue().length > 0;

const submitOne = async (entry: PendingPublisherReport) => {
  const reportToSend = structuredClone(entry.report);

  if (entry.accountType === 'vip') {
    const whoami = await apiValidateMe();
    const remoteCode = whoami.result.cong_access_code;
    const accessCode = decryptData(remoteCode, entry.localAccessCode, 'access_code');

    encryptObject({ data: reportToSend, table: 'incoming_reports', accessCode });

    await apiUserFieldServiceReportPost(reportToSend);
    return;
  }

  const whoami = await apiPocketValidateMe();
  const remoteCode = whoami.result.app_settings.cong_settings.cong_access_code;
  const accessCode = decryptData(remoteCode, entry.localAccessCode, 'access_code');

  encryptObject({ data: reportToSend, table: 'incoming_reports', accessCode });

  await apiPocketFieldServiceReportPost(reportToSend);
};

let isProcessing = false;

export const processPendingPublisherReports = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const queue = readQueue();
    if (queue.length === 0) return;

    const stillPending: PendingPublisherReport[] = [];

    for (const entry of queue) {
      try {
        await submitOne(entry);
      } catch (error) {
        if (isNetworkError(error)) {
          stillPending.push(entry);
        } else {
          // Not a connectivity problem (e.g. a decryption mismatch) — retrying
          // forever won't fix it. Drop it but tell the user so it doesn't just
          // silently vanish without the secretary ever seeing it.
          console.error('Dropping permanently-failing pending report:', error);
          displaySnackNotification({
            header: getMessageByCode('error_app_generic-title'),
            message:
              'No se pudo enviar un informe de servicio guardado. Vuelve a enviarlo desde tu informe mensual.',
            severity: 'error',
          });
        }
      }
    }

    writeQueue(stillPending);
  } finally {
    isProcessing = false;
  }
};
