import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { isTest } from '@constants/index';
import { congAccountConnectedState } from '@states/app';
import { congIDState } from '@states/settings';
import {
  subscribeForceUpdate,
  ForceUpdateSignal,
} from '@services/firebase/force_update';
import { canAutoReload, forceAppUpdate } from '@services/app/pwa_update';
import logger from '@services/logger';

/**
 * Oleada de actualización forzada.
 *
 * Escucha el documento `congregation/{congId}/sync/force_update` de Firestore.
 * Cuando su `target_build` es MAYOR que el build de este dispositivo, se
 * actualiza y recarga solo — pero esperando a que la persona no esté
 * escribiendo (para no interrumpir un informe a medio rellenar), y con un
 * retraso aleatorio para que 30 dispositivos no recarguen en el mismo instante.
 *
 * El disparo lo controla el administrador escribiendo el build objetivo en ese
 * documento (solo el Admin SDK puede escribirlo; las reglas deniegan la
 * escritura a los clientes). Aditivo: el chequeo automático cada 30 min de
 * useUpdater sigue igual; esto solo permite empujar una oleada puntual.
 *
 * ANTI-BUCLE — esto fue un incidente real, no una precaución teórica.
 * Decía "es inerte para quien ya está al día, así que no hay bucle", y era
 * mentira: la única marca de "ya he reaccionado a este objetivo" era un `ref`
 * en memoria, que la recarga se lleva por delante. Si tras recargar el
 * dispositivo NO conseguía subirse a un build >= objetivo —porque no había
 * nada más nuevo que descargar, o porque el objetivo apuntaba a un build que
 * nadie puede alcanzar— volvía a verlo al arrancar y se recargaba otra vez.
 * Para siempre, en toda la congregación, sin forma de salir de la pantalla de
 * inicio. Ahora hay dos candados independientes:
 *
 *   1. La marca de "ya tratado" vive en localStorage y sobrevive a la recarga:
 *      un objetivo se atiende UNA vez por dispositivo, pase lo que pase.
 *   2. La oleada no recarga si no hay de verdad una versión nueva que
 *      instalar (`reloadWhenUpToDate: false`): recargar sin nada que traer
 *      deja el dispositivo igual, que es justo lo que alimentaba el bucle.
 *
 * Y sigue existiendo el interruptor de emergencia por dispositivo:
 * `localStorage.elda_force_update = '0'`.
 */

const HANDLED_KEY = 'elda_force_update_handled';

const readHandled = () => {
  try {
    return Number(localStorage.getItem(HANDLED_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeHandled = (target: number) => {
  try {
    localStorage.setItem(HANDLED_KEY, String(target));
  } catch {
    // Sin localStorage (modo privado con almacenamiento bloqueado) queda el
    // segundo candado: sin versión nueva no se recarga.
  }
};

const REACT_DELAY_MIN_MS = 3000;
const REACT_DELAY_MAX_MS = 20000;
const TYPING_RECHECK_MS = 5000;

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

const useForceUpdate = () => {
  const isConnected = useAtomValue(congAccountConnectedState);
  const congId = useAtomValue(congIDState);

  // build de ESTA versión (número de commits; string inyectado por vite)
  const currentBuild = Number(__BUILD_NUMBER__) || 0;

  // Ya reaccionamos a este objetivo. En localStorage, NO en memoria: un `ref`
  // se reinicia con la recarga, que es precisamente lo que hacía el bucle.
  const handledRef = useRef(readHandled());

  useEffect(() => {
    // desactivable en un dispositivo con localStorage.elda_force_update='0'
    const disabled = localStorage.getItem('elda_force_update') === '0';
    if (disabled || isTest || !congId || !isConnected) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const runWhenIdle = (target: number) => {
      // no recargar mientras la persona escribe; reintentar en unos segundos
      if (isTyping()) {
        idleTimer = setTimeout(() => runWhenIdle(target), TYPING_RECHECK_MS);
        return;
      }

      const delay =
        REACT_DELAY_MIN_MS +
        Math.random() * (REACT_DELAY_MAX_MS - REACT_DELAY_MIN_MS);

      idleTimer = setTimeout(() => {
        logger.info(
          'app',
          `forced update wave -> build ${target} (tengo ${currentBuild})`
        );

        // Sin versión nueva que instalar NO se recarga: recargar en seco deja
        // el dispositivo igual y la oleada volvería a dispararse al arrancar.
        forceAppUpdate(undefined, { reloadWhenUpToDate: false });
      }, delay);
    };

    const handleSignal = (signal: ForceUpdateSignal) => {
      const target = Number(signal.target_build) || 0;

      // solo si hay una versión más nueva que la mía y no la he tratado ya
      if (target <= currentBuild || target <= handledRef.current) return;

      // Red de seguridad global, antes de comprometerse: si el dispositivo ya
      // ha recargado sola varias veces seguidas, no se insiste.
      if (!canAutoReload()) return;

      handledRef.current = target;
      writeHandled(target);

      runWhenIdle(target);
    };

    const unsubscribe = subscribeForceUpdate(congId, handleSignal);

    return () => {
      unsubscribe();
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [congId, isConnected, currentBuild]);
};

export default useForceUpdate;
