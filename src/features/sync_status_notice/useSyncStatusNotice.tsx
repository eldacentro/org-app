import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLiveQuery } from 'dexie-react-hooks';
import appDb from '@db/appDb';
import {
  congAccountConnectedState,
  isAppDataSyncingState,
  isAppLoadState,
  isOnlineState,
} from '@states/app';
import { backupAutoState, congIDState } from '@states/settings';
import { isTest } from '@constants/index';
import { LAST_SYNC_STORAGE_KEY } from '@wrapper/web_worker/useWebWorker';
import { formatSyncAge } from '@utils/sync_age';

// Cuánto tiempo sin sincronizar hace falta para avisar. Dos horas para el caso
// normal (nadie necesita saber que lleva veinte minutos sin sincronizar si no
// tiene nada pendiente) y media hora si hay cambios propios sin subir o la
// cuenta está desconectada, que es cuando de verdad importa.
const STALE_MINUTES = 120;
const STALE_MINUTES_URGENT = 30;

const REFRESH_MS = 60_000;

const readLastSyncAt = () => {
  try {
    const stored = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (!stored) return 0;

    const time = new Date(stored).getTime();
    return Number.isNaN(time) ? 0 : time;
  } catch {
    return 0;
  }
};

/**
 * Aviso honesto de "esto lleva sin sincronizarse".
 *
 * La app ya reconecta y reintenta sola, pero cuando algo falla de verdad
 * (cuenta caída, sin cobertura durante días, sesión revocada) lo único que se
 * veía era un puntito rojo en el avatar que casi nadie asocia con "tus datos
 * no están subiendo". Esto lo dice con palabras, y solo cuando es cierto.
 */
const useSyncStatusNotice = () => {
  const isOnline = useAtomValue(isOnlineState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const isAppLoad = useAtomValue(isAppLoadState);
  const isSyncing = useAtomValue(isAppDataSyncingState);
  const congID = useAtomValue(congIDState);
  const backupAuto = useAtomValue(backupAutoState);

  const isPendingSync = useLiveQuery(async () => {
    const metadata = await appDb.metadata.get(1);
    if (!metadata) return false;

    return Object.values(metadata.metadata).some(
      (table) => table.send_local === true
    );
  }, []);

  // La marca guardada se relee en cada tic y también al terminar un ciclo de
  // sincronización, que es justo cuando cambia.
  const [{ now, lastSyncAt }, setClock] = useState(() => ({
    now: Date.now(),
    lastSyncAt: readLastSyncAt(),
  }));

  useEffect(() => {
    const update = () =>
      setClock({ now: Date.now(), lastSyncAt: readLastSyncAt() });

    update();

    const timer = setInterval(update, REFRESH_MS);
    return () => clearInterval(timer);
  }, [isSyncing]);

  const minutes = useMemo(() => {
    if (lastSyncAt === 0) return 0;

    return Math.max(0, Math.floor((now - lastSyncAt) / 60000));
  }, [lastSyncAt, now]);

  const visible = useMemo(() => {
    if (isTest || isAppLoad || congID.length === 0) return false;

    // Sin ninguna sincronización registrada no se puede decir cuánto lleva:
    // mejor callar que inventar una cifra.
    if (lastSyncAt === 0) return false;

    // Con la sincronización automática apagada a propósito, que lleve horas
    // sin sincronizar es lo esperado y avisar sería dar la lata. Solo se avisa
    // si además hay cambios propios sin enviar, que eso sí conviene saberlo.
    if (!backupAuto && !isPendingSync) return false;

    const threshold =
      isPendingSync || !isConnected ? STALE_MINUTES_URGENT : STALE_MINUTES;

    return minutes >= threshold;
  }, [
    isAppLoad,
    congID,
    lastSyncAt,
    isPendingSync,
    isConnected,
    minutes,
    backupAuto,
  ]);

  const message = useMemo(() => {
    const age = formatSyncAge(minutes);

    if (!isOnline) {
      return `Sin conexión a internet: llevas ${age} sin sincronizar. Lo que hagas se guarda en este dispositivo y se enviará solo en cuanto vuelva la conexión.`;
    }

    if (!isConnected) {
      return `Llevas ${age} sin sincronizar. La cuenta está desconectada y se está reconectando sola; si sigue así, cierra sesión y vuelve a entrar.`;
    }

    if (isPendingSync) {
      return `Llevas ${age} sin sincronizar y tienes cambios sin enviar. Se está reintentando.`;
    }

    return `Llevas ${age} sin sincronizar. Se está reintentando.`;
  }, [minutes, isOnline, isConnected, isPendingSync]);

  return { visible, message };
};

export default useSyncStatusNotice;
