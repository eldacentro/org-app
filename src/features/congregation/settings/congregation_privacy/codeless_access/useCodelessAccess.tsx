import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { settingsState } from '@states/settings';
import { isOnlineState } from '@states/app';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { useAppTranslation } from '@hooks/index';
import { apiGetAutoProvision, apiSetAutoProvision } from '@services/api/congregation';

// Acceso sin código (Mejora 3): permite que los hermanos de solo-lectura entren
// con Google sin teclear el código de acceso. Al activarlo, el código de acceso
// (que el admin ya tiene en local) se envía al servidor para provisionarlo.
const useCodelessAccess = () => {
  const { t } = useAppTranslation();

  const settings = useAtomValue(settingsState);
  const isOnline = useAtomValue(isOnlineState);

  const [enabled, setEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { status, data } = await apiGetAutoProvision();
        if (status === 200) setEnabled(!!data.enabled);
      } catch (error) {
        console.error(error);
      }
    };

    if (isOnline) loadStatus();
  }, [isOnline]);

  const handleToggle = async () => {
    if (isProcessing) return;

    const next = !enabled;
    const accessCode = settings.cong_settings.cong_access_code || '';

    // Para activar necesitamos el código de acceso en local (el admin ya debe
    // haberlo introducido al entrar).
    if (next && accessCode.length === 0) {
      displaySnackNotification({
        header: t('error_app_generic-title'),
        message: t('tr_codelessAccessNoCode'),
        severity: 'error',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const { status, data } = await apiSetAutoProvision(
        next,
        next ? accessCode : ''
      );

      if (status !== 200) {
        throw new Error(data?.message || 'error_app_generic-desc');
      }

      setEnabled(next);

      displaySnackNotification({
        header: t('tr_successfully'),
        message: next
          ? t('tr_codelessAccessEnabledDesc')
          : t('tr_codelessAccessDisabledDesc'),
        severity: 'success',
      });
    } catch (error) {
      displaySnackNotification({
        header: t('error_app_generic-title'),
        message: getMessageByCode((error as Error).message),
        severity: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return { enabled, handleToggle, isProcessing };
};

export default useCodelessAccess;
