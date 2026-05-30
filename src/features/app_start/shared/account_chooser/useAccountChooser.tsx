import { useSetAtom } from 'jotai';
import { authProvider, setAuthPersistence, userSignInPopup } from '@services/firebase/auth';
import { isAccountChooseState, isAuthProcessingState, isUserAccountCreatedState } from '@states/app';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displayOnboardingFeedback } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import useAuth from '../../vip/hooks/useAuth';
import useFeedback from '../hooks/useFeedback';
import useAppTranslation from '@hooks/useAppTranslation';

const useAccountChooser = () => {
  const { t } = useAppTranslation();
  const { showMessage, hideMessage } = useFeedback();
  const { handlePostLogin } = useAuth();

  const setIsAccountChoose = useSetAtom(isAccountChooseState);
  const setIsUserAccountCreated = useSetAtom(isUserAccountCreatedState);
  const setIsAuthProcessing = useSetAtom(isAuthProcessingState);

  const handleChooseGoogle = async () => {
    try {
      setIsAuthProcessing(true);
      hideMessage();

      await setAuthPersistence();

      const result = await userSignInPopup(authProvider.Google);

      if (!result) {
        setIsAuthProcessing(false);
        return;
      }

      // Set account type to vip as it's the unified flow now (after successful login)
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
