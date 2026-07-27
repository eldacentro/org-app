import { useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  isAppDataSyncingState,
  isAppLoadState,
  showReloadState,
} from '@states/app';
import { store } from '@states/index';
import { allowUnload } from '@services/app/unload_guard';
import { canAutoReload } from '@services/app/pwa_update';

// Ver el watchdog correspondiente en index.html: se marca ANTES de recargar
// para que, si la app nunca termina de arrancar tras esta recarga, ese script
// (que corre antes de que exista cualquier bundle de React) pueda forzar una
// recuperación dura en vez de dejar a la persona viendo el logo para siempre.
const UPDATE_FLAG = 'pwa-update-pending';

// El navegador solo busca un service-worker.js nuevo al registrar/navegar
// (como mucho cada 24 h por su cuenta) — quien deja la app abierta días no se
// entera de que hay versión nueva y nunca ve el botón "Actualizar". Este
// chequeo activo pide la comprobación cada 30 min y también al volver la app
// a primer plano (con un mínimo de 5 min entre chequeos para no abusar).
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_CHECK_MIN_GAP_MS = 5 * 60 * 1000;

// Aplicar la actualización sin depender de que nadie pulse nada.
//
// El service worker nuevo se activa solo (skipWaiting + clientsClaim), pero la
// página sigue ejecutando el CÓDIGO VIEJO hasta que se recarga. Quien no
// pulsaba el aviso "Actualizar" —que es casi todo el mundo— se quedaba
// semanas con la versión antigua, y además en un estado mixto (código viejo
// pidiéndole trozos al service worker nuevo) que es de donde salen los
// errores raros de carga. Ahora, en cuanto el service worker nuevo toma el
// control, la app se recarga sola en el primer momento en que no molesta.
const AUTO_RELOAD_KEY = 'pwa-auto-reload-at';
const AUTO_RELOAD_MIN_GAP_MS = 10 * 60 * 1000;
const AUTO_RELOAD_TYPING_RECHECK_MS = 5000;
const AUTO_RELOAD_DELAY_MS = 1500;

const isBusy = async () => {
  const element = document.activeElement as HTMLElement | null;

  if (element) {
    const tag = element.tagName;

    if (tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable) {
      return true;
    }
  }

  // Tampoco en mitad de un diálogo abierto: recargar ahí tira lo que la
  // persona estuviera rellenando.
  if (document.querySelector('.MuiDialog-root') !== null) return true;

  // Ni con una sincronización en marcha o cambios sin subir: además de ser
  // mal momento, el aviso de "puede que no se guarden los cambios" que la app
  // pone al cerrar la pestaña saltaría en mitad de una recarga que nadie ha
  // pedido, y eso asusta con razón.
  if (store.get(isAppDataSyncingState)) return true;

  // Ni durante el arranque o el alta: recargar en mitad del inicio de sesión o
  // de la pantalla de claves deja a la persona sin saber qué ha pasado.
  if (store.get(isAppLoadState)) return true;

  // A propósito NO se mira si hay cambios sin subir. Un dispositivo que lleva
  // días sin poder sincronizar los tiene pendientes de forma permanente, y es
  // justo el que más necesita la versión nueva: bloquear ahí lo condenaría a
  // no actualizarse nunca. No se pierde nada — lo pendiente está guardado en
  // el dispositivo y se sube en cuanto la sincronización vuelva a funcionar.

  return false;
};

const useUpdater = ({ updatePwa }: { updatePwa: VoidFunction }) => {
  const [showReload, setShowReload] = useAtom(showReloadState);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let lastCheck = Date.now();

    const checkForUpdate = async () => {
      lastCheck = Date.now();

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      } catch {
        // sin red o registro no disponible: el próximo chequeo lo reintenta
      }
    };

    const timer = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck < UPDATE_CHECK_MIN_GAP_MS) return;
      checkForUpdate();
    };

    // El service worker nuevo ha tomado el control → recargar sola, en cuanto
    // no se esté escribiendo ni haya un diálogo abierto.
    let autoReloadTimer: ReturnType<typeof setTimeout> | null = null;
    let autoReloadArmed = false;

    const applyUpdateWhenIdle = async () => {
      if (await isBusy()) {
        autoReloadTimer = setTimeout(
          applyUpdateWhenIdle,
          AUTO_RELOAD_TYPING_RECHECK_MS
        );
        return;
      }

      autoReloadTimer = setTimeout(() => {
        // Red de seguridad global compartida con la oleada de actualización:
        // pase lo que pase, la app no se queda recargándose sola sin fin.
        if (!canAutoReload()) return;

        sessionStorage.setItem(UPDATE_FLAG, '1');
        allowUnload();
        window.location.reload();
      }, AUTO_RELOAD_DELAY_MS);
    };

    // Si al abrir no había ningún service worker al mando, este evento es la
    // PRIMERA instalación, no una actualización: no hay código viejo que
    // reemplazar y recargar ahí solo sería un parpadeo sin sentido.
    const hadController = Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      if (!hadController || autoReloadArmed) return;

      // Freno anti-bucle: como mucho una recarga automática cada diez minutos.
      // Si algo hiciera que el service worker se reactivara sin parar, la app
      // no se quedaría recargándose en bucle delante de nadie.
      const previous = Number(sessionStorage.getItem(AUTO_RELOAD_KEY)) || 0;

      if (Date.now() - previous < AUTO_RELOAD_MIN_GAP_MS) return;

      autoReloadArmed = true;
      sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));

      applyUpdateWhenIdle();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange
    );

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange
      );
      if (autoReloadTimer) clearTimeout(autoReloadTimer);
    };
  }, []);

  const handleAppUpdated = () => {
    setShowReload(false);
    sessionStorage.setItem(UPDATE_FLAG, '1');
    allowUnload();

    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    // El listener se adjunta ANTES de disparar la actualización (updatePwa
    // más abajo) — si se adjuntara después, un service worker que ya haya
    // tomado el control por su cuenta (skipWaiting/clientsClaim ya forzados
    // en workbox.config.ts) podría disparar "controllerchange" antes de que
    // este código llegue a escucharlo, dejando la recarga real colgando
    // únicamente del setTimeout de más abajo.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, {
        once: true,
      });
    }

    updatePwa();

    // Red de seguridad: si por lo que sea "controllerchange" nunca llega
    // (p. ej. no había ninguna actualización realmente pendiente), no nos
    // quedamos esperando para siempre.
    setTimeout(reloadOnce, 3000);
  };

  return { handleAppUpdated, showReload };
};

export default useUpdater;
