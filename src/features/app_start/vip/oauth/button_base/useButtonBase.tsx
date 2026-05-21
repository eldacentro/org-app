import { useAtom, useAtomValue } from 'jotai';
import {
  currentProviderState,
  isAuthProcessingState,
} from '@states/app';
import {
  setAuthPersistence,
  userSignInPopup,
  userSignInRedirect,
} from '@services/firebase/auth';
import { displayOnboardingFeedback } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { OAuthButtonBaseProps } from './index.types';
import useAppTranslation from '@hooks/useAppTranslation';
import useAuth from '../../hooks/useAuth';
import useFeedback from '@features/app_start/shared/hooks/useFeedback';

const useButtonBase = ({ provider }: OAuthButtonBaseProps) => {
  const { t } = useAppTranslation();

  const { showMessage, hideMessage } = useFeedback();

  const { handlePostLogin } = useAuth();

  const [isAuthProcessing, setIsAuthProcessing] = useAtom(
    isAuthProcessingState
  );

  const currentProvider = useAtomValue(currentProviderState);

  const handleOAuthAction = async () => {
    try {
      if (isAuthProcessing) return;

      hideMessage();

      await setAuthPersistence();

      const result = await userSignInPopup(provider);

      if (!result) return;

      await handlePostLogin();
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

  return { handleOAuthAction, isAuthProcessing, currentProvider };
};

export default useButtonBase;
