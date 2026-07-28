import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { isAboutOpenState } from '@states/app';
import { setIsAboutOpen, setIsSupportOpen } from '@services/states/app';
import { useConfirm } from '@components/confirm_dialog';
import { AppUpdateOutcome, forceAppUpdate } from '@services/app/pwa_update';
import useManualSync from '@hooks/useManualSync';
import { AboutProps } from './index.types';
import { instantSyncStatusState } from '@states/app';
import { formatSyncAge } from '@utils/sync_age';

const parser = new DOMParser();

const currentYear = new Date().getFullYear();

const useAbout = ({ updatePwa }: AboutProps) => {
  const instantSync = useAtomValue(instantSyncStatusState);

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

  /**
   * Estado del sync instantáneo, en una línea.
   *
   * Es lo único que faltaba para poder responder "¿sigue funcionando?" sin
   * abrir la consola: si el timbre se cae o alguien deja el kill-switch
   * remoto puesto, la app sigue sincronizando cada pocos minutos y lo único
   * que se nota es que "va lenta".
   */
  const instantSyncText = (() => {
    if (instantSync.disabledRemotely) {
      return 'Desactivado para toda la congregación. Se sincroniza por el intervalo normal.';
    }

    if (!instantSync.listening) {
      return 'Sin conexión con el aviso. Se sincroniza por el intervalo normal.';
    }

    if (instantSync.lastSignalAt === null) {
      // Ya no se pone solo por conectarse: si dice esto, es que de verdad no
      // ha sonado ningún timbre desde que se abrió la aplicación (algo normal
      // si nadie ha editado nada en ese rato).
      return 'Conectado. Sin avisos desde que se abrió la aplicación.';
    }

    const minutes = Math.max(
      0,
      Math.floor((Date.now() - instantSync.lastSignalAt) / 60000)
    );

    // Los dos números son lo que hace falta para diagnosticar: cuántos timbres
    // han sonado y cuántos traían algo para este dispositivo. Muchos avisos y
    // ninguno atendido es una pista concreta (versiones locales al día, o una
    // tabla que este rol no recibe), no un "va lento" a secas.
    const avisos =
      instantSync.signalsReceived === 1
        ? '1 aviso'
        : `${instantSync.signalsReceived} avisos`;

    return `Conectado. ${avisos}, ${instantSync.signalsActed} con datos nuevos. Último hace ${formatSyncAge(minutes)}.`;
  })();

  return {
    instantSyncText,
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
