import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSetAtom } from 'jotai';
import {
  setAuthPersistence,
  userSignInCustomToken,
} from '@services/firebase/auth';
import { apiUpdatePasswordlessInfo } from '@services/api/user';
import {
  displayOnboardingFeedback,
  setIsUnauthorizedRole,
} from '@services/states/app';
import { useAppTranslation } from '@hooks/index';
import { getMessageByCode } from '@services/i18n/translation';
import { NextStepType } from './index.types';
import { UserLoginResponseType } from '@definition/api';
import { vipOnboardingStepState } from '@states/app';
import useAuth from '../hooks/useAuth';
import useFeedback from '@features/app_start/shared/hooks/useFeedback';

const useEmailLinkAuth = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const { t } = useAppTranslation();

  const { hideMessage, message, showMessage, title, variant, isVisible } = useFeedback();

  const { determineNextStep, updateUserSettings } = useAuth();

  const setStep = useSetAtom(vipOnboardingStepState);

  const [isProcessing, setIsProcessing] = useState(false);

  const code = searchParams.get('code');

  const handleAuthorizationError = async (message: string) => {
    displayOnboardingFeedback({
      title: getMessageByCode('error_app_generic-title'),
      message: getMessageByCode(message),
    });

    showMessage();
    setIsProcessing(false);
  };

  const handleReturn = () => {
    setStep('sign_in');
    setSearchParams('');
  };

  const handleUnauthorizedUser = () => {
    setStep('none');
    setIsUnauthorizedRole(true);
  };

  const completeEmailAuth = async () => {
    try {
      if (isProcessing) return;

      hideMessage();
      setIsProcessing(true);

      await setAuthPersistence();
      const result = await userSignInCustomToken(code);

      if (!result) return;

      const { status, data } = await apiUpdatePasswordlessInfo();

      setSearchParams('');

      if (status !== 200) {
        handleAuthorizationError(data.message);
        return;
      }

      const nextStep: NextStepType = determineNextStep(
        data as UserLoginResponseType
      );

      if (
        nextStep.isVerifyMFA ||
        nextStep.encryption ||
        nextStep.createCongregation
      ) {
        await updateUserSettings(data as UserLoginResponseType, nextStep);
      }

      if (nextStep.unauthorized) {
        handleUnauthorizedUser();
      }

      setIsProcessing(false);
    } catch (err) {
      console.error(err);

      await handleAuthorizationError(
        err.code || err.message || t('error_app_generic-desc')
      );
    }
  };

  return {
    completeEmailAuth,
    isProcessing,
    handleReturn,
    title,
    isVisible,
    message,
    variant,
    hideMessage,
  };
};

export default useEmailLinkAuth;
