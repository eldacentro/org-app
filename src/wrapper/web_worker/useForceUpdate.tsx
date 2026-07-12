import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { isTest } from '@constants/index';
import { congAccountConnectedState } from '@states/app';
import { congIDState } from '@states/settings';
import { subscribeForceUpdate, ForceUpdateSignal } from '@services/firebase/force_update';
import { forceAppUpdate } from '@services/app/pwa_update';
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
 * escritura a los clientes). Es inerte para quien ya está al día, así que no
 * hay bucle. Aditivo: el chequeo automático cada 30 min de useUpdater sigue
 * igual; esto solo permite empujar una oleada puntual cuando hace falta.
 */

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

  // ya reaccionamos a este target (evita repetir mientras carga la recarga)
  const handledRef = useRef(0);

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
        logger.info('app', `forced update wave -> build ${target} (tengo ${currentBuild})`);
        forceAppUpdate();
      }, delay);
    };

    const handleSignal = (signal: ForceUpdateSignal) => {
      const target = Number(signal.target_build) || 0;

      // solo si hay una versión más nueva que la mía y no la he tratado ya
      if (target <= currentBuild || target <= handledRef.current) return;

      handledRef.current = target;
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
