import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import {
  authProvider,
  getAuthRedirectResult,
  setAuthPersistence,
  userSignInPopup,
  userSignInRedirect,
} from '@services/firebase/auth';
import { isAccountChooseState, isAuthProcessingState, isUserAccountCreatedState } from '@states/app';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displayOnboardingFeedback } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import useAuth from '../../vip/hooks/useAuth';
import useFeedback from '../hooks/useFeedback';
import useAppTranslation from '@hooks/useAppTranslation';

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

const useAccountChooser = () => {
  const { t } = useAppTranslation();
  const { showMessage, hideMessage } = useFeedback();
  const { handlePostLogin } = useAuth();

  const setIsAccountChoose = useSetAtom(isAccountChooseState);
  const setIsUserAccountCreated = useSetAtom(isUserAccountCreatedState);
  const setIsAuthProcessing = useSetAtom(isAuthProcessingState);

  // On mobile, signInWithRedirect redirects the page away and back.
  // Check for a pending redirect result on mount and complete the login flow.
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const user = await getAuthRedirectResult();
        if (!user) return;

        setIsAuthProcessing(true);
        hideMessage();
        await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
        setIsUserAccountCreated(false);
        await handlePostLogin(user);
        setIsAccountChoose(false);
      } catch (error) {
        console.error(error);
        displayOnboardingFeedback({
          title: getMessageByCode('error_app_generic-title'),
          message: getMessageByCode(
            error.code || error.message || t('error_app_generic-desc')
          ),
        });
        showMessage();
      } finally {
        setIsAuthProcessing(false);
      }
    };

    checkRedirectResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChooseGoogle = async () => {
    try {
      setIsAuthProcessing(true);
      hideMessage();
      setAuthPersistence();

      if (isMobile) {
        await userSignInRedirect(authProvider.Google);
        return; // page navigates away; result handled in the useEffect above on return
      }

      const result = await userSignInPopup(authProvider.Google);

      if (!result) {
        setIsAuthProcessing(false);
        return;
      }

      await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
      setIsUserAccountCreated(false);
      await handlePostLogin();
      setIsAccountChoose(false);
      setIsAuthProcessing(false);
    } catch (error) {
      console.error(error);
      displayOnboardingFeedback({
        title: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(
          error.code || error.message || t('error_app_generic-desc')
        ),
      });

      showMessage();
      setIsAuthProcessing(false);
    }
  };

  return { handleChooseGoogle };
};

export default useAccountChooser;
