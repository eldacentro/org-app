import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { shouldResetLocalData } from '@services/app/account_guard';
import { handleDeleteDatabase } from '@services/app';
import { useAppTranslation, useFirebaseAuth } from '@hooks/index';
import { recoverVipSession } from '@services/app/session_recovery';
import { userSignOut } from '@services/firebase/auth';
import { decryptData } from '@services/encryption/index';
import { apiValidateMe } from '@services/api/user';
import { displayOnboardingFeedback } from '@services/states/app';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { congIDState } from '@states/settings';
import useFeedback from '@features/app_start/shared/hooks/useFeedback';

const useCongregationMasterKey = () => {
  const { t } = useAppTranslation();

  const { isAuthenticated } = useFirebaseAuth();

  const { hideMessage, message, showMessage, title, variant, isVisible } =
    useFeedback();

  const congID = useAtomValue(congIDState);

  const [isLoading, setIsLoading] = useState(true);
  const [tmpMasterKey, setTmpMasterKey] = useState('');
  const [tmpMasterKeyVerify, setTmpMasterKeyVerify] = useState('');
  const [isLengthPassed, setIsLengthPassed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [congMasterKey, setCongMasterKey] = useState('');

  const btnActionDisabled = !isLengthPassed;

  const handleValidateMasterKey = async () => {
    if (isProcessing) return;
    hideMessage();
    setIsProcessing(true);

    try {
      decryptData(congMasterKey, tmpMasterKey, 'master_key');

      await dbAppSettingsUpdate({
        'cong_settings.cong_master_key': tmpMasterKey,
      });
    } catch (err) {
      console.error(err);
      displayOnboardingFeedback({
        title: t('error_app_generic-title'),
        message: t('tr_encryptionCodeInvalid'),
      });
      showMessage();

      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const getMasterKey = async () => {
      setIsLoading(true);

      let { status, result } = await apiValidateMe();

      if (status === 403) {
        // Igual que en la pantalla del código de acceso: un 403 no es motivo
        // para cerrar la sesión sin decir nada. Dos de sus cuatro motivos se
        // reponen solos, y cerrarla destruye la sesión de Firebase, con lo que
        // ya no queda nada que refrescar. Ver `session_recovery`.
        const verdict = await recoverVipSession(result?.message ?? '403');

        if (verdict === 'recovered') {
          ({ status, result } = await apiValidateMe());
        }

        if (verdict !== 'terminal' && status !== 200) {
          setIsLoading(false);
          return;
        }

        if (verdict === 'terminal') {
          await userSignOut();
          return;
        }
      }

      // congregation not found -> user not authorized and delete local data
      if (status === 404) {
        // Igual que en la pantalla del código: confirmar antes de destruir
        // nada (ver account_guard).
        const confirmed = await shouldResetLocalData({
          accountType: 'vip',
          reason: 'master key screen 404',
          message: result?.message,
        });

        if (confirmed) {
          await handleDeleteDatabase();
          return;
        }

        setIsLoading(false);
        return;
      }

      if (status === 200) {
        if (
          congID.length > 0 &&
          typeof result.cong_id === 'string' &&
          result.cong_id.length > 0 &&
          result.cong_id !== congID
        ) {
          await handleDeleteDatabase();
          return;
        }
      }

      setCongMasterKey(result.cong_master_key);
      setIsLoading(false);
    };

    if (isAuthenticated) getMasterKey();
  }, [isAuthenticated, congID]);

  useEffect(() => {
    setIsLengthPassed(tmpMasterKey.length >= 16);
  }, [tmpMasterKey, tmpMasterKeyVerify]);

  return {
    isLoading,
    tmpMasterKey,
    setTmpMasterKey,
    tmpMasterKeyVerify,
    setTmpMasterKeyVerify,
    isLengthPassed,
    isProcessing,
    handleValidateMasterKey,
    message,
    title,
    isVisible,
    hideMessage,
    variant,
    btnActionDisabled,
  };
};

export default useCongregationMasterKey;
