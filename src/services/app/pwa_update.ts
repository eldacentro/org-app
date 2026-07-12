/**
 * Actualización robusta del service worker: espera de verdad a que la
 * comprobación de versión termine y recarga justo cuando el SW nuevo toma el
 * control (con skipWaiting se autoactiva; además se le manda SKIP_WAITING por
 * si quedara a la espera). Con red de seguridad por temporizador.
 *
 * El `updatePwa()` de @sws2apps/react-sw-helper NO espera a registration.update()
 * y comprueba `waiting` en el mismo instante, por eso a veces "no hacía nada".
 * Esta función lo hace bien y la comparten el botón "Actualizar" de Acerca de y
 * la oleada de actualización forzada (useForceUpdate).
 *
 * @param extraTrigger  callback opcional idempotente (p. ej. el updatePwa de la
 *                      librería) que se dispara además, por si acaso.
 */
export const forceAppUpdate = async (extraTrigger?: () => void) => {
  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  if (!('serviceWorker' in navigator)) {
    reloadOnce();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      reloadOnce();
      return;
    }

    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, {
      once: true,
    });

    await registration.update();

    const activateWaiting = () =>
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

    if (registration.waiting) {
      activateWaiting();
    } else if (registration.installing) {
      registration.installing.addEventListener('statechange', activateWaiting);
    }

    extraTrigger?.();

    const hasUpdate = Boolean(registration.installing || registration.waiting);

    // Con actualización, controllerchange dispara la recarga; el temporizador es
    // la red de seguridad. Sin actualización (ya al día), recarga en seco.
    setTimeout(reloadOnce, hasUpdate ? 6000 : 1200);
  } catch (error) {
    console.error(error);
    reloadOnce();
  }
};
