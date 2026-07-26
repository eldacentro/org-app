import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { AccessCodeChangeType } from './index.types';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import {
  apiGetAutoProvision,
  apiGetCongregationAccessCode,
  apiSetAutoProvision,
  apiSetCongregationAccessCode,
} from '@services/api/congregation';
import { decryptData, encryptData } from '@services/encryption';
import { congAccessCodeState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';

const useAccessCodeChange = (onClose: AccessCodeChangeType['onClose']) => {
  const localAccessCode = useAtomValue(congAccessCodeState);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAccessCode, setCurrentAccessCode] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [confirmAccessCode, setConfirmAccessCode] = useState('');

  const handleCurrentAccessCodeChange = (value: string) =>
    setCurrentAccessCode(value);

  const handleNewAccessCodeChange = (value: string) => setNewAccessCode(value);

  const handleConfirmAccessCodeChange = (value: string) =>
    setConfirmAccessCode(value);

  const handleChangeAccessCode = async () => {
    if (
      currentAccessCode.length === 0 ||
      newAccessCode.length === 0 ||
      confirmAccessCode.length === 0 ||
      confirmAccessCode.length < 8 ||
      newAccessCode !== confirmAccessCode
    )
      return;

    try {
      setIsProcessing(true);

      // Se lee ANTES del cambio: al guardar el código nuevo, el servidor anula
      // el acceso sin código (la copia en claro que tenía guardada ya no
      // serviría para abrir nada). Si estaba activado, se vuelve a dejar
      // activado abajo con el código nuevo, para que nadie tenga que volver a
      // teclearlo ni el administrador tenga que acordarse.
      let codelessWasEnabled = false;

      try {
        const provision = await apiGetAutoProvision();
        codelessWasEnabled =
          provision.status === 200 && !!provision.data?.enabled;
      } catch (error) {
        console.error('No se pudo leer el acceso sin código:', error);
      }

      const { status, message } = await apiGetCongregationAccessCode();

      if (status !== 200) {
        displaySnackNotification({
          header: getMessageByCode('error_app_generic-title'),
          message: getMessageByCode(message),
          severity: 'error',
        });

        return;
      }

      const remoteAccessCode = decryptData(
        message,
        localAccessCode,
        'access_code'
      );

      const newAccessCode = encryptData(remoteAccessCode, confirmAccessCode);

      const setCodeFetch = await apiSetCongregationAccessCode(newAccessCode);

      if (setCodeFetch.status !== 200) {
        displaySnackNotification({
          header: getMessageByCode('error_app_generic-title'),
          message: getMessageByCode(setCodeFetch.data.message),
          severity: 'error',
        });

        return;
      }

      await dbAppSettingsUpdate({
        'cong_settings.cong_access_code': confirmAccessCode,
      });

      if (codelessWasEnabled) {
        try {
          await apiSetAutoProvision(true, confirmAccessCode);
        } catch (error) {
          console.error('No se pudo actualizar el acceso sin código:', error);

          displaySnackNotification({
            header: getMessageByCode('error_app_generic-title'),
            message:
              'El código se cambió, pero el acceso sin código quedó desactivado. Vuelve a activarlo en Privacidad.',
            severity: 'error',
          });
        }
      }

      setIsProcessing(false);
      onClose?.();
    } catch (error) {
      console.error(error);

      setIsProcessing(false);
      onClose?.();

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    isProcessing,
    handleChangeAccessCode,
    currentAccessCode,
    handleCurrentAccessCodeChange,
    newAccessCode,
    handleNewAccessCodeChange,
    confirmAccessCode,
    handleConfirmAccessCodeChange,
  };
};

export default useAccessCodeChange;
