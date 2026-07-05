import { useAtom } from 'jotai';
import { showReloadState } from '@states/app';

// Ver el watchdog correspondiente en index.html: se marca ANTES de recargar
// para que, si la app nunca termina de arrancar tras esta recarga, ese script
// (que corre antes de que exista cualquier bundle de React) pueda forzar una
// recuperación dura en vez de dejar a la persona viendo el logo para siempre.
const UPDATE_FLAG = 'pwa-update-pending';

const useUpdater = ({ updatePwa }: { updatePwa: VoidFunction }) => {
  const [showReload, setShowReload] = useAtom(showReloadState);

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
