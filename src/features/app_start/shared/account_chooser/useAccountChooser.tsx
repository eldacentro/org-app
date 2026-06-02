import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import {
  authProvider,
  currentAuthUser,
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
  // getRedirectResult() may return null if Firebase already consumed the result
  // internally during SDK init (onAuthStateChanged fires before this effect runs).
  // Fall back to currentUser so the post-login flow still completes.
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const redirectUser = await getAuthRedirectResult();
        const firebaseUser = redirectUser ?? currentAuthUser();

        if (!firebaseUser) return;

        setIsAuthProcessing(true);
        hideMessage();
        await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
        setIsUserAccountCreated(false);
        await handlePostLogin(firebaseUser);
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
