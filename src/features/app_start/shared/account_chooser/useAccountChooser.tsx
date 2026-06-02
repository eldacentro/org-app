import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import {
  authProvider,
  setAuthPersistence,
  userSignInPopup,
} from '@services/firebase/auth';
import { isAccountChooseState, isAuthProcessingState } from '@states/app';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displayOnboardingFeedback } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import useFirebaseAuth from '@hooks/useFirebaseAuth';
import useFeedback from '../hooks/useFeedback';
import useAppTranslation from '@hooks/useAppTranslation';

const useAccountChooser = () => {
  const { t } = useAppTranslation();
  const { showMessage, hideMessage } = useFeedback();
  const { isAuthenticated, loading: isAuthLoading } = useFirebaseAuth();

  const setIsAccountChoose = useSetAtom(isAccountChooseState);
  const setIsAuthProcessing = useSetAtom(isAuthProcessingState);

  // When Firebase confirms the user is authenticated, mark account_type as 'vip'.
  // This transitions shared/startup from AccountChooser → VipStartup.
  // VipStartup's runStartupCheck then handles the full post-login API flow.
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    const markAccount = async () => {
      try {
        console.log('[markAccount] isAuthenticated=true → setting account_type=vip');
        setIsAuthProcessing(true);
        await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
        setIsAccountChoose(false);
        console.log('[markAccount] account_type set → VipStartup should mount');
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

    markAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAuthLoading]);

  const handleChooseGoogle = async () => {
    try {
      hideMessage();
      await setAuthPersistence();

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
