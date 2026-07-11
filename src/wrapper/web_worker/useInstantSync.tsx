import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { useLiveQuery } from 'dexie-react-hooks';
import { isTest } from '@constants/index';
import { congAccountConnectedState, isOnlineState } from '@states/app';
import { backupAutoState, congIDState } from '@states/settings';
import { useFirebaseAuth } from '@hooks/index';
import { subscribeSyncSignal, SyncSignal } from '@services/firebase/sync_signal';
import worker from '@services/worker/backupWorker';
import logger from '@services/logger';
import appDb from '@db/appDb';

/**
 * Sync casi-instantáneo (activo por defecto; ver kill-switches en `enabled`):
 *
 * 1. TIMBRE (bajada): escucha la señal de Firestore que emite el backend tras
 *    cada subida de otro dispositivo; si alguna tabla remota es más nueva que
 *    la local, adelanta el ciclo de sync normal con un retraso aleatorio de
 *    2–12 s (para que 30 dispositivos no golpeen el servidor a la vez).
 * 2. SUBIDA INMEDIATA: cuando algo local queda pendiente de enviar
 *    (send_local), dispara el sync a los ~4 s en vez de esperar al intervalo
 *    (el debounce agrupa ráfagas de edición en una sola subida).
 *
 * Todo es aditivo: el intervalo periódico de useWebWorker sigue intacto como
 * red de seguridad, y el mecanismo de subida/bajada/cifrado no cambia — aquí
 * solo se decide CUÁNDO arranca el ciclo. El dispositivo que acaba de subir
 * recibe su propia señal, pero sus versiones locales ya coinciden con las del
 * documento, así que no re-sincroniza (anti-bucle por construcción).
 */

const SIGNAL_DEBOUNCE_MIN_MS = 2000;
const SIGNAL_DEBOUNCE_MAX_MS = 12000;
const PENDING_UPLOAD_DEBOUNCE_MS = 4000;

const useInstantSync = () => {
  const location = useLocation();

  const { user } = useFirebaseAuth();

  const isOnline = useAtomValue(isOnlineState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const backupAuto = useAtomValue(backupAutoState);
  const congId = useAtomValue(congIDState);

  // activo por defecto para todos (fase de prueba superada). Se puede apagar
  // en un dispositivo concreto con localStorage.elda_sync_instant = '0' (para
  // depurar), y para toda la congregación con enabled:false en el documento
  // de señal de Firestore (kill-switch remoto, sin redesplegar).
  const [enabled] = useState(
    () => localStorage.getItem('elda_sync_instant') !== '0'
  );

  const backupEnabled = !isTest && isOnline && isConnected && backupAuto;

  // refs para que los timers lean siempre el estado más reciente
  const stateRef = useRef({ backupEnabled, user, pathname: location.pathname });
  stateRef.current = { backupEnabled, user, pathname: location.pathname };

  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSync = async (reason: string) => {
    const { backupEnabled, user, pathname } = stateRef.current;

    if (!backupEnabled) return;

    // misma pausa que el ciclo periódico: nunca con una ficha de persona abierta
    if (/\/persons\/.+/.test(pathname)) {
      logger.info('app', `instant sync skipped (person detail open) - ${reason}`);
      return;
    }

    // Si hay un sync en curso no hace falta guardarlo aquí: el worker ya
    // coalesce (pendingBackup) y ejecutará un ciclo más al terminar.
    logger.info('app', `instant sync triggered - ${reason}`);

    if (user) {
      // sin forzar refresco: el SDK devuelve el token cacheado (y lo renueva
      // solo si está por caducar). Forzarlo haría que 30 dispositivos pidan
      // token nuevo a Google a la vez tras cada edición — el mismo patrón de
      // ráfaga que aprendimos a evitar en el ciclo periódico.
      const idToken = await user.getIdToken();
      if (idToken?.length > 0) {
        worker.postMessage({ field: 'idToken', value: idToken });
      }
    }

    worker.postMessage('startWorker');
  };

  // ── 1. TIMBRE: señal remota → sync adelantado ────────────────────────────
  useEffect(() => {
    if (!enabled || isTest || !congId || !isConnected) return;

    const handleSignal = async (signal: SyncSignal) => {
      if (signal.enabled === false) return; // kill-switch remoto
      if (!signal.tables) return;

      const metadata = await appDb.metadata.get(1);
      if (!metadata) return;

      const hasNewer = Object.entries(signal.tables).some(([table, version]) => {
        const local = metadata.metadata[table]?.version;
        // tabla sin versión local = este rol no la recibe (o primer sync
        // pendiente, que ya cubre el intervalo normal) → no dispara
        return Boolean(local) && typeof version === 'string' && version > local;
      });

      if (!hasNewer) return;

      // colapsar señales en ráfaga en un solo disparo
      if (signalTimerRef.current) clearTimeout(signalTimerRef.current);

      const delay =
        SIGNAL_DEBOUNCE_MIN_MS +
        Math.random() * (SIGNAL_DEBOUNCE_MAX_MS - SIGNAL_DEBOUNCE_MIN_MS);

      signalTimerRef.current = setTimeout(() => {
        signalTimerRef.current = null;
        triggerSync('remote signal');
      }, delay);
    };

    const unsubscribe = subscribeSyncSignal(congId, handleSignal);

    return () => {
      unsubscribe();
      if (signalTimerRef.current) {
        clearTimeout(signalTimerRef.current);
        signalTimerRef.current = null;
      }
    };
  }, [enabled, congId, isConnected]);

  // ── 2. SUBIDA INMEDIATA: cambios locales pendientes → sync a los ~4 s ────
  const isPendingSync = useLiveQuery(async () => {
    if (!enabled) return false;
    const metadata = await appDb.metadata.get(1);
    if (!metadata) return false;
    return Object.values(metadata.metadata).some((table) => table.send_local === true);
  }, [enabled]);

  const prevPendingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const becamePending = isPendingSync === true && !prevPendingRef.current;
    prevPendingRef.current = isPendingSync === true;

    if (!becamePending) return;

    if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);

    uploadTimerRef.current = setTimeout(() => {
      uploadTimerRef.current = null;
      triggerSync('local changes pending');
    }, PENDING_UPLOAD_DEBOUNCE_MS);

    return () => {
      if (uploadTimerRef.current) {
        clearTimeout(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
    };
  }, [enabled, isPendingSync]);
};

export default useInstantSync;
