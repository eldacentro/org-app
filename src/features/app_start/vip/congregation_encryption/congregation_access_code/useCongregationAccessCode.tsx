import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { shouldResetLocalData } from '@services/app/account_guard';
import { handleDeleteDatabase, loadApp, runUpdater } from '@services/app';
import { useAppTranslation, useFirebaseAuth } from '@hooks/index';
import { recoverVipSession } from '@services/app/session_recovery';
import { userSignOut } from '@services/firebase/auth';
import { decryptData } from '@services/encryption/index';
import { apiValidateMe } from '@services/api/user';
import { displayOnboardingFeedback } from '@services/states/app';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { isAppLoadState, isSetupState } from '@states/app';
import { congIDState, congMasterKeyState } from '@states/settings';
import { saveKeysSecurely } from '@services/secure_storage';
import useFeedback from '@features/app_start/shared/hooks/useFeedback';

const useCongregationAccessCode = () => {
  const { t } = useAppTranslation();

  const { isAuthenticated, user } = useFirebaseAuth();

  const { hideMessage, message, showMessage, title, variant, isVisible } =
    useFeedback();

  const setIsSetup = useSetAtom(isSetupState);
  const setIsAppLoad = useSetAtom(isAppLoadState);

  const congID = useAtomValue(congIDState);
  const congMasterKey = useAtomValue(congMasterKeyState);

  const [isLoading, setIsLoading] = useState(true);
  const [tmpAccessCode, setTmpAccessCode] = useState('');
  const [tmpAccessCodeVerify, setTmpAccessCodeVerify] = useState('');
  const [isLengthPassed, setIsLengthPassed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [congAccessCode, setCongAccessCode] = useState('');
  const [rememberKeys, setRememberKeys] = useState(false);

  const btnActionDisabled = !isLengthPassed;

  const handleValidateAccessCode = async () => {
    if (isProcessing) return;
    hideMessage();
    setIsProcessing(true);

    try {
      decryptData(congAccessCode, tmpAccessCode, 'access_code');

      await dbAppSettingsUpdate({
        'cong_settings.cong_access_code': tmpAccessCode,
      });

      // Opt-in: persist the validated keys on this device so they don't have to
      // be retyped after a logout / session reset. Master key is the plaintext
      // already stored in settings (empty for Pocket users, which is fine).
      if (rememberKeys && user?.uid) {
        await saveKeysSecurely(user.uid, congMasterKey, tmpAccessCode);
      }

      setIsSetup(false);
      await runUpdater();
      loadApp();
      setTimeout(() => {
        setIsAppLoad(false);
      }, 1000);
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
    const getAccessCode = async () => {
      setIsLoading(true);

      let { status, result } = await apiValidateMe();

      if (status === 403) {
        // ANTES SE CERRABA LA SESIÓN AQUÍ, y sin decir absolutamente nada: el
        // hermano estaba metiendo el código de acceso y de golpe se encontraba
        // en la pantalla de entrada, sin ningún mensaje.
        //
        // De los cuatro motivos de un 403, dos se arreglan solos y en silencio
        // —un token que el servidor no pudo verificar porque acaba de
        // reiniciarse, o la cookie de sesión que Safari purga por su cuenta cada
        // pocos días—. Cerrar sesión ahí destruye la sesión de Firebase y ya no
        // queda nada que refrescar. Ver `session_recovery`.
        const verdict = await recoverVipSession(result?.message ?? '403');

        if (verdict === 'recovered') {
          ({ status, result } = await apiValidateMe());
        }

        if (verdict !== 'terminal' && status !== 200) {
          // Ahora no se puede. No se cierra nada: se deja la pantalla como está
          // para que pueda reintentar, en vez de echarlo.
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
        // Se vuelve a preguntar antes de borrar: un 404 aquí puede ser la
        // carrera conocida justo después del handshake (ver account_guard).
        const confirmed = await shouldResetLocalData({
          accountType: 'vip',
          reason: 'access code screen 404',
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

      setCongAccessCode(result.cong_access_code);

      setIsLoading(false);
    };

    if (isAuthenticated) getAccessCode();
  }, [isAuthenticated, congID]);

  useEffect(() => {
    setIsLengthPassed(tmpAccessCode.length >= 8);
  }, [tmpAccessCode, tmpAccessCodeVerify]);

  return {
    isLoading,
    tmpAccessCode,
    setTmpAccessCode,
    isLengthPassed,
    isProcessing,
    handleValidateAccessCode,
    message,
    title,
    isVisible,
    hideMessage,
    variant,
    setTmpAccessCodeVerify,
    tmpAccessCodeVerify,
    btnActionDisabled,
    rememberKeys,
    setRememberKeys,
  };
};

export default useCongregationAccessCode;
