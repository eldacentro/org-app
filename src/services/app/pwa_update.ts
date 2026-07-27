import { allowUnload } from './unload_guard';

const RELOAD_LOG_KEY = 'elda_auto_reload_log';
const MAX_AUTO_RELOADS = 3;
const AUTO_RELOAD_WINDOW_MS = 10 * 60 * 1000;

/**
 * Cortacircuitos de las recargas AUTOMÁTICAS.
 *
 * La app se recarga sola en varios sitios (oleada de actualización, service
 * worker nuevo, recuperación de la base de datos). Cada uno tiene su propio
 * freno, pero un fallo en cualquiera de ellos deja la app recargándose en la
 * pantalla de inicio sin forma de salir — le pasó a la congregación entera.
 *
 * Esto es la red por debajo de todos: como mucho tres recargas automáticas
 * cada diez minutos por dispositivo. Nunca se aplica a una recarga que haya
 * pedido una persona (el botón "Actualizar"), solo a las que decide la app.
 *
 * Si no hay localStorage, deja pasar: es una red de seguridad, no un permiso.
 */
export const canAutoReload = () => {
  try {
    const now = Date.now();

    const previous: number[] = JSON.parse(
      localStorage.getItem(RELOAD_LOG_KEY) || '[]'
    );

    const recent = previous.filter(
      (value) => typeof value === 'number' && now - value < AUTO_RELOAD_WINDOW_MS
    );

    if (recent.length >= MAX_AUTO_RELOADS) {
      console.warn(
        'Recarga automática frenada: demasiadas seguidas. Se reanudará en unos minutos.'
      );
      return false;
    }

    recent.push(now);
    localStorage.setItem(RELOAD_LOG_KEY, JSON.stringify(recent));

    return true;
  } catch {
    return true;
  }
};

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
 * @param options.reloadWhenUpToDate
 *   Si NO hay ninguna versión nueva que instalar, ¿recargar igualmente?
 *   El botón "Actualizar" que pulsa una persona: sí — ha pedido recargar y
 *   verlo. La oleada automática: NO, jamás. Recargar sin nada nuevo que traer
 *   deja el dispositivo exactamente igual que estaba, así que la oleada
 *   volvería a dispararse al arrancar y la app se quedaría recargándose sola
 *   para siempre, sin forma de salir. Devuelve `true` si llegó a recargar.
 */
export const forceAppUpdate = async (
  extraTrigger?: () => void,
  options?: { reloadWhenUpToDate?: boolean }
) => {
  const reloadWhenUpToDate = options?.reloadWhenUpToDate ?? true;
  // Recarga decidida por la app: que no salte el aviso de "puede que no se
  // guarden los cambios" (ver unload_guard).
  allowUnload();

  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  if (!('serviceWorker' in navigator)) {
    if (reloadWhenUpToDate) reloadOnce();
    return reloadWhenUpToDate;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      if (reloadWhenUpToDate) reloadOnce();
      return reloadWhenUpToDate;
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

    if (!hasUpdate && !reloadWhenUpToDate) {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        reloadOnce
      );
      return false;
    }

    // Con actualización, controllerchange dispara la recarga; el temporizador es
    // la red de seguridad. Sin actualización (ya al día), recarga en seco.
    setTimeout(reloadOnce, hasUpdate ? 6000 : 1200);

    return true;
  } catch (error) {
    console.error(error);

    if (reloadWhenUpToDate) reloadOnce();

    return reloadWhenUpToDate;
  }
};
