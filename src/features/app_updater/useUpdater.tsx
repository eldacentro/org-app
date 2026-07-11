import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { showReloadState } from '@states/app';

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

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const handleAppUpdated = () => {
    setShowReload(false);
    sessionStorage.setItem(UPDATE_FLAG, '1');

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
