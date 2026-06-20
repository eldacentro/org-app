import { useRef, useState } from 'react';
import { useSetAtom } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import {
  isEmailLinkAuthenticateState,
  isEmailSentState,
  isUnauthorizedRoleState,
  isUserAccountCreatedState,
  isUserSignInState,
} from '@states/app';
import { displayOnboardingFeedback } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { apiHandleVerifyEmailOTP } from '@services/api/user';
import { NextStepType } from './index.types';
import useAuth from '../hooks/useAuth';
import useFeedback from '@features/app_start/shared/hooks/useFeedback';
import { UserLoginResponseType } from '@definition/api';
import { userSignInCustomToken } from '@services/firebase/auth';

const useEmailSent = () => {
  const { t } = useAppTranslation();

  const { hideMessage, message, showMessage, title, variant, isVisible } = useFeedback();

  const { determineNextStep, updateUserSettings } = useAuth();

  const setIsEmailLink = useSetAtom(isEmailLinkAuthenticateState);
  const setIsEmailSent = useSetAtom(isEmailSentState);
  const setIsUserAccountCreated = useSetAtom(isUserAccountCreatedState);
  const setIsUnauthorizedRole = useSetAtom(isUnauthorizedRoleState);
  const setIsUserSignIn = useSetAtom(isUserSignInState);

  const [code, setCode] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Synchronous lock: the 6th digit auto-triggers verification, and without
  // this, pasting a code or re-typing fast enough could fire a second
  // apiHandleVerifyEmailOTP call while the first is still in flight.
  const verifyingRef = useRef(false);

  const handleReturnChooser = () => {
    setIsEmailSent(false);
    setIsUserSignIn(true);
  };

  const handleLinkClick = () => {
    setIsEmailSent(false);
    setIsEmailLink(true);
  };

  const handleUnauthorizedUser = () => {
    setIsEmailSent(false);
    setIsUserAccountCreated(false);
    setIsUnauthorizedRole(true);
  };

  const handleAuthorization = async (data: UserLoginResponseType) => {
    const nextStep: NextStepType = determineNextStep(data);

    if (nextStep.encryption || nextStep.createCongregation) {
      await updateUserSettings(data, nextStep);
    }

    if (nextStep.unauthorized) {
      handleUnauthorizedUser();
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setIsProcessing(true);

    try {
      const { data, status } = await apiHandleVerifyEmailOTP(code);

      if (status === 403) {
        setHasError(true);

        displayOnboardingFeedback({
          title: t('tr_2FAIncorrect'),
          message: t('tr_2FAIncorrectDesc'),
        });

        showMessage();

        return;
      }

      localStorage.removeItem('emailForSignIn');

      if (status !== 200) {
        throw new Error(data?.message);
      }

      await userSignInCustomToken(data.custom_token);

      handleAuthorization(data);
    } catch (error) {
      console.error(error);

      displayOnboardingFeedback({
        title: t('error_app_generic-title'),
        message: getMessageByCode(error.message),
      });

      showMessage();
    } finally {
      verifyingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleCodeChange = (value: string) => {
    if (verifyingRef.current) return;
    setHasError(false);
    setCode(value);

    if (value.length < 6) return;

    handleVerifyCode(value);
  };

  return {
    hideMessage,
    message,
    title,
    isVisible,
    variant,
    handleLinkClick,
    handleCodeChange,
    code,
    hasError,
    handleReturnChooser,
    isProcessing,
  };
};

export default useEmailSent;
