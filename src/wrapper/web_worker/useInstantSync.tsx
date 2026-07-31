import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLiveQuery } from 'dexie-react-hooks';
import { isTest } from '@constants/index';
import {
  congAccountConnectedState,
  instantSyncStatusState,
  isOnlineState,
} from '@states/app';
import { backupAutoState, congIDState } from '@states/settings';
import { useFirebaseAuth } from '@hooks/index';
import {
  subscribeSyncSignal,
  SyncSignal,
  SyncSignalMeta,
} from '@services/firebase/sync_signal';
import {
  createSignalScheduler,
  findNewerTables,
  pickSignalDelay,
} from '@services/app/instant_sync';
import worker from '@services/worker/backupWorker';
import logger from '@services/logger';
import { isPersonDetailInUse } from '@services/app/sync_pause';
import appDb from '@db/appDb';

/**
 * Sync casi-instantáneo (activo por defecto; ver kill-switches en `enabled`):
 *
 * 1. TIMBRE (bajada): escucha la señal de Firestore que emite el backend tras
 *    cada subida de otro dispositivo; si alguna tabla remota es más nueva que
 *    la local, adelanta el ciclo de sync normal con un retraso aleatorio
 *    (para que 30 dispositivos no golpeen el servidor a la vez). El reparto y
 *    la comparación viven en `services/app/instant_sync`, con sus pruebas.
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

const PENDING_UPLOAD_DEBOUNCE_MS = 4000;

const useInstantSync = () => {
  const location = useLocation();

  const { user } = useFirebaseAuth();

  const isOnline = useAtomValue(isOnlineState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const backupAuto = useAtomValue(backupAutoState);
  const congId = useAtomValue(congIDState);
  const setInstantStatus = useSetAtom(instantSyncStatusState);

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

  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSync = async (reason: string) => {
    const { backupEnabled, user, pathname } = stateRef.current;

    if (!backupEnabled) return;

    // misma pausa que el ciclo periódico: nunca con una ficha de persona
    // abierta Y alguien delante (la pausa caduca sola, ver sync_pause)
    if (isPersonDetailInUse(pathname)) {
      logger.info(
        'app',
        `instant sync skipped (person detail open) - ${reason}`
      );
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
    if (!enabled || isTest || !congId || !isConnected) {
      setInstantStatus((prev) => ({ ...prev, listening: false }));
      return;
    }

    const scheduler = createSignalScheduler(() => triggerSync('remote signal'));

    const handleSignal = async (signal: SyncSignal, meta: SyncSignalMeta) => {
      // La entrega inicial no es un timbre: es el documento que ya estaba ahí,
      // que Firestore entrega siempre al suscribirse. Se REACCIONA a ella
      // (recupera lo que cambió con la app cerrada) pero no se cuenta como
      // aviso, o el indicador miente en cada arranque.
      setInstantStatus((prev) => ({
        ...prev,
        disabledRemotely: signal.enabled === false,
        lastSignalAt: meta.initial ? prev.lastSignalAt : Date.now(),
        signalsReceived: prev.signalsReceived + (meta.initial ? 0 : 1),
      }));

      if (signal.enabled === false) return; // kill-switch remoto
      if (!signal.tables) return;

      const metadata = await appDb.metadata.get(1);
      if (!metadata) return;

      const newer = findNewerTables(signal.tables, metadata.metadata);

      if (newer.length === 0) {
        // Antes esto era un `return` mudo, y ahí estaba el problema de fondo
        // para diagnosticar: en la consola no había forma de distinguir "la
        // señal no llega" de "llega y no traía nada para mí". Es la pregunta
        // que hay que responder primero cada vez que alguien dice que la
        // sincronización va lenta.
        if (!meta.initial) {
          logger.info(
            'app',
            `instant sync signal received - nothing newer (${Object.keys(signal.tables).length} tablas)`
          );
        }

        return;
      }

      setInstantStatus((prev) => ({
        ...prev,
        signalsActed: prev.signalsActed + (meta.initial ? 0 : 1),
      }));

      // Una señal que llega con un disparo ya programado viaja en ESE ciclo:
      // reprogramarlo lo posponía sin fin cuando varios editaban a la vez
      // (ver createSignalScheduler).
      const outcome = scheduler.schedule(pickSignalDelay());

      logger.info(
        'app',
        `instant sync signal received - ${newer.join(', ')} (${outcome})`
      );
    };

    const unsubscribe = subscribeSyncSignal(congId, handleSignal, (listening) =>
      setInstantStatus((prev) => ({ ...prev, listening }))
    );

    return () => {
      unsubscribe();
      scheduler.cancel();
    };
  }, [enabled, congId, isConnected, setInstantStatus]);

  // ── 2. SUBIDA INMEDIATA: cambios locales pendientes → sync a los ~4 s ────
  const isPendingSync = useLiveQuery(async () => {
    if (!enabled) return false;
    const metadata = await appDb.metadata.get(1);
    if (!metadata) return false;
    return Object.values(metadata.metadata).some(
      (table) => table.send_local === true
    );
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
