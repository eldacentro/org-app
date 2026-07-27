import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { isAboutOpenState } from '@states/app';
import { setIsAboutOpen, setIsSupportOpen } from '@services/states/app';
import { useConfirm } from '@components/confirm_dialog';
import { AppUpdateOutcome, forceAppUpdate } from '@services/app/pwa_update';
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

  // Estado visible de la actualización.
  //
  // Antes esto era una sola línea sin estado: se pulsaba y no pasaba nada
  // durante bastante rato (la comprobación va contra la red y no tenía tope),
  // y cuando ya estabas en la última versión recargaba en seco, así que
  // parecía que el botón no servía para nada. Ahora dice en qué punto está y
  // cómo ha acabado.
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | AppUpdateOutcome
  >('idle');

  const handleForceReload = async () => {
    if (updateStatus === 'checking' || updateStatus === 'updating') return;

    setUpdateStatus('checking');

    // Le pasamos el updatePwa() de la librería como disparador extra
    // idempotente. El margen antes de recargar es para que dé tiempo a leer
    // el resultado en vez de que la pantalla se vaya de golpe.
    const outcome = await forceAppUpdate(updatePwa, {
      onStatus: setUpdateStatus,
      reloadDelayMs: 1500,
    });

    setUpdateStatus(outcome);
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
    updateStatus,
    handleFullReDownload,
    isConnected,
    ConfirmDialogNode,
    privacyText,
  };
};

export default useAbout;
