import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import {
  authProvider,
  setAuthPersistence,
  userSignInPopup,
  userSignInRedirect,
} from '@services/firebase/auth';
import { isAccountChooseState, isAuthProcessingState, isUserAccountCreatedState } from '@states/app';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displayOnboardingFeedback } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import useFirebaseAuth from '@hooks/useFirebaseAuth';
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
  const { isAuthenticated, loading: isAuthLoading } = useFirebaseAuth();

  const setIsAccountChoose = useSetAtom(isAccountChooseState);
  const setIsUserAccountCreated = useSetAtom(isUserAccountCreatedState);
  const setIsAuthProcessing = useSetAtom(isAuthProcessingState);

  // Reacts to Firebase auth state. Covers two cases:
  // 1. Mobile redirect: page reloads, Firebase restores session → isAuthenticated becomes true
  // 2. Desktop popup: user completes Google sign-in → isAuthenticated becomes true
  // In both cases we run the same post-login flow.
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const processLogin = async () => {
      try {
        setIsAuthProcessing(true);
        hideMessage();
        await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
        setIsUserAccountCreated(false);
        await handlePostLogin();
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

    processLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAuthLoading]);

  const handleChooseGoogle = async () => {
    try {
      hideMessage();
      setAuthPersistence();

      if (isMobile) {
        // Page navigates away to Google. On return, the useEffect above handles post-login.
        await userSignInRedirect(authProvider.Google);
        return;
      }

      // Desktop: show spinner while popup is open.
      // After popup closes, isAuthenticated becomes true → useEffect handles post-login.
      setIsAuthProcessing(true);
      await userSignInPopup(authProvider.Google);
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
