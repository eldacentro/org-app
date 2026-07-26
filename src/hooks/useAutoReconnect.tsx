import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import {
  congAccountConnectedState,
  isAppLoadState,
  isOnlineState,
} from '@states/app';
import { accountTypeState, congIDState } from '@states/settings';
import { isTest } from '@constants/index';
import { setCongAccountConnected } from '@services/states/app';
import worker from '@services/worker/backupWorker';
import useFirebaseAuth from './useFirebaseAuth';

/**
 * Reconexión automática y silenciosa de la cuenta.
 *
 * Contexto: la sincronización solo corre cuando la cuenta está marcada como
 * conectada (`backupEnabled = isOnline && isConnected && backupAuto`). Ese
 * estado no se persiste: arranca en falso en cada carga y solo lo pone a
 * verdadero el arranque o la revalidación de fondo. Si esa revalidación
 * fallaba —un bache de red al abrir la app, el servidor tardando, el móvil
 * abriendo la PWA sin cobertura— la cuenta se quedaba desconectada para
 * siempre: nadie invalidaba la consulta al recuperar la red, así que el
 * hermano seguía trabajando con todo guardado en local y NADA subiendo, sin
 * enterarse. La única salida era el botón "Reconectar cuenta", que casi nadie
 * encuentra ni sabe qué significa.
 *
 * Este vigilante cierra ese agujero: mientras haya cuenta configurada en el
 * dispositivo y no esté conectada, revalida por su cuenta con reintentos cada
 * vez más espaciados, y de inmediato cuando vuelve la red o cuando el hermano
 * vuelve a la app. No pide nada ni muestra nada: si funciona, no se nota.
 *
 * "Desconectado a propósito" se distingue solo: cerrar sesión borra la
 * congregación local y la sesión de Firebase, así que `accountReady` pasa a
 * falso y el vigilante se apaga.
 */

// Reintentos espaciados: rápido al principio (un bache de red se arregla en
// segundos) y cada vez más lento, hasta uno cada 5 minutos. Se reinicia a la
// primera posición cuando vuelve la red o el hermano vuelve a la pestaña.
const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];

// Margen aleatorio sobre cada espera. Sin esto, todos los dispositivos que
// perdieron la conexión a la vez (típico tras un despliegue o un corte del
// servidor) reintentarían en el mismo instante exacto, en bloque — el mismo
// patrón de tráfico que ya se evita en el temporizador de sincronización.
const RETRY_JITTER_RATIO = 0.3;

const useAutoReconnect = () => {
  const queryClient = useQueryClient();

  const { isAuthenticated, user } = useFirebaseAuth();

  const isOnline = useAtomValue(isOnlineState);
  const isConnected = useAtomValue(congAccountConnectedState);
  const isAppLoad = useAtomValue(isAppLoadState);
  const accountType = useAtomValue(accountTypeState);
  const congID = useAtomValue(congIDState);

  // La cuenta está configurada en este dispositivo. Para VIP hace falta además
  // sesión viva de Firebase: si se cerró sesión a propósito, no hay nada que
  // reconectar.
  const accountReady =
    !isTest &&
    congID.length > 0 &&
    (accountType === 'pocket' ||
      (accountType === 'vip' && isAuthenticated && !!user));

  const queryKey = accountType === 'pocket' ? 'whoami-pocket' : 'whoami-vip';

  const [attemptTick, setAttemptTick] = useState(0);
  const attemptRef = useRef(0);
  const runningRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Un intento de reconexión. Refresca el token (el worker de sincronización
   * no sabe pedirse uno nuevo por su cuenta: depende de que se lo mande el
   * hilo principal) y vuelve a lanzar la consulta de validación, que es quien
   * ya sabe tratar todos los casos —rol cambiado, congregación distinta,
   * sesión revocada— sin duplicar aquí esa lógica.
   */
  const revalidate = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      if (accountType === 'vip' && user) {
        try {
          const idToken = await user.getIdToken(true);

          if (idToken?.length > 0) {
            worker.postMessage({ field: 'idToken', value: idToken });
          }
        } catch {
          // Sin red o token irrecuperable: la validación de abajo lo dirá.
        }
      }

      await queryClient.invalidateQueries({ queryKey: [queryKey] });

      // La consulta ya trae la respuesta buena; leerla del caché evita
      // depender de que el efecto de useUserAutoLogin vuelva a dispararse
      // (react-query reutiliza la referencia cuando el resultado es idéntico,
      // y entonces ese efecto no corre). Solo se toca la bandera de conexión:
      // del resto —roles, congregación, borrados— sigue encargándose él.
      const data = queryClient.getQueryData<{ status: number }>([queryKey]);

      if (data?.status === 200) {
        setCongAccountConnected(true);
        worker.postMessage('startWorker');
      }
    } catch {
      // Un fallo aquí es casi siempre falta de red: se reintenta solo.
    } finally {
      runningRef.current = false;
    }
  }, [accountType, user, queryClient, queryKey]);

  // Vuelve la red → reintentar ya, sin esperar al siguiente ciclo. Si la
  // cuenta seguía conectada, al menos se le manda un token fresco al worker y
  // se sincroniza: su token cacheado puede llevar rancio todo el corte.
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline || wasOnline || !accountReady || isAppLoad) return;

    attemptRef.current = 0;
    revalidate();
  }, [isOnline, accountReady, isAppLoad, revalidate]);

  // Vuelve el hermano a la app → si estaba desconectado, reintentar ya y
  // reiniciar la espera (react-query ya revalida al recuperar el foco cuando
  // la consulta está activa, pero esto cubre también el caso de que el último
  // intento fallara y toque esperar cinco minutos).
  useEffect(() => {
    if (!accountReady || isConnected) return;

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (!navigator.onLine) return;

      attemptRef.current = 0;
      revalidate();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [accountReady, isConnected, revalidate]);

  // Bucle de reintentos mientras la cuenta esté configurada pero desconectada.
  useEffect(() => {
    if (!accountReady || isAppLoad || !isOnline || isConnected) {
      attemptRef.current = 0;
      return;
    }

    const base =
      RETRY_DELAYS_MS[Math.min(attemptRef.current, RETRY_DELAYS_MS.length - 1)];
    const delay = base + base * RETRY_JITTER_RATIO * Math.random();

    const timer = setTimeout(async () => {
      attemptRef.current += 1;

      await revalidate();

      // Reprograma el siguiente intento: si el de ahora funcionó, el efecto
      // vuelve a entrar con isConnected en true y sale por la puerta de arriba.
      if (mountedRef.current) {
        setAttemptTick((value) => value + 1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [accountReady, isAppLoad, isOnline, isConnected, revalidate, attemptTick]);
};

export default useAutoReconnect;
