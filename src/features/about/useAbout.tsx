import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { isAboutOpenState } from '@states/app';
import { setIsAboutOpen, setIsSupportOpen } from '@services/states/app';
import { useConfirm } from '@components/confirm_dialog';
import useManualSync from '@hooks/useManualSync';
import { AboutProps } from './index.types';

const parser = new DOMParser();

const currentYear = new Date().getFullYear();

const useAbout = ({ updatePwa }: AboutProps) => {
  const { t } = useAppTranslation();

  const isOpen = useAtomValue(isAboutOpenState);

  const { confirm, ConfirmDialogNode } = useConfirm();
  const { isConnected, handleFullResync } = useManualSync();

  const privacyText = useMemo(() => {
    const htmlString = t('tr_privacySecurityDesc');
    const html = parser.parseFromString(htmlString, 'text/html');
    const privacyLink = Array.from(html.querySelectorAll('a')).at(1);

    return privacyLink?.textContent || '';
  }, [t]);

  // El updatePwa() de la librería lanza registration.update() pero NO lo espera:
  // comprueba `waiting` en el mismo instante, antes de que la comprobación haya
  // encontrado e instalado nada. Por eso el primer toque a menudo no hacía nada
  // y había que pulsar varias veces (y encima recargaba a los 2 s fijos,
  // compitiendo con la activación). Aquí esperamos la comprobación de verdad y
  // recargamos justo cuando el service worker nuevo toma el control.
  const handleForceReload = async () => {
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

      // Con skipWaiting, el SW nuevo se activa solo en cuanto se instala y
      // dispara 'controllerchange' — ese es el momento correcto de recargar.
      navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, {
        once: true,
      });

      // ESPERAR a que la comprobación termine (lo que la librería se salta).
      await registration.update();

      // Por si el SW nuevo quedara a la espera en vez de autoactivarse.
      const activateWaiting = () =>
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });

      if (registration.waiting) {
        activateWaiting();
      } else if (registration.installing) {
        registration.installing.addEventListener('statechange', activateWaiting);
      }

      // trigger extra de la librería (idempotente)
      updatePwa();

      const hasUpdate = Boolean(
        registration.installing || registration.waiting
      );

      // Con actualización, controllerchange dispara la recarga; el temporizador
      // es solo la red de seguridad. Sin actualización (ya al día), recarga en
      // seco enseguida para dar respuesta inmediata.
      setTimeout(reloadOnce, hasUpdate ? 6000 : 1200);
    } catch (error) {
      console.error(error);
      reloadOnce();
    }
  };

  const handleFullReDownload = async () => {
    const ok = await confirm({
      title: t('tr_reDownloadDataTitle'),
      message: t('tr_reDownloadDataConfirm'),
      confirmLabel: t('tr_reDownloadDataAction'),
    });

    if (!ok) return;

    setIsAboutOpen(false);
    await handleFullResync();
  };

  const handleClose = () => setIsAboutOpen(false);

  const handleOpenSupport = () => {
    setIsAboutOpen(false);
    setIsSupportOpen(true);
  };

  const handleOpenDoc = () => {
    window.open(`https://guide.organized-app.com`, '_blank');
  };

  return {
    isOpen,
    handleClose,
    currentYear,
    handleOpenDoc,
    handleOpenSupport,
    handleForceReload,
    handleFullReDownload,
    isConnected,
    ConfirmDialogNode,
    privacyText,
  };
};

export default useAbout;
