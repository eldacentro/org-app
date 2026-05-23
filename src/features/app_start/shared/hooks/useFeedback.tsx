import {
  onboardingMessageState,
  onboardingTitleState,
  onboardingVariantState,
} from '@states/app';
import { useAtomValue } from 'jotai';

const useFeedback = () => {
  const title = useAtomValue(onboardingTitleState);
  const message = useAtomValue(onboardingMessageState);
  const variant = useAtomValue(onboardingVariantState);

  const hideMessage = () => {
    const onboardingError =
      document.querySelector<HTMLElement>('#onboarding-error');
    if (onboardingError) {
      onboardingError.style.animation = 'fade-out 0.15s forwards';
    }
  };

  const showMessage = () => {
    const onboardingError =
      document.querySelector<HTMLElement>('#onboarding-error');
    if (onboardingError) {
      onboardingError.style.opacity = '0';
      onboardingError.style.display = 'block';
      onboardingError.style.animation = 'fade-in 0.15s forwards';
    }
  };

  return { title, message, variant, hideMessage, showMessage };
};

export default useFeedback;
