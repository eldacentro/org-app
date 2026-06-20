import {
  onboardingMessageState,
  onboardingMessageVisibleState,
  onboardingTitleState,
  onboardingVariantState,
} from '@states/app';
import { useAtomValue, useSetAtom } from 'jotai';

const useFeedback = () => {
  const title = useAtomValue(onboardingTitleState);
  const message = useAtomValue(onboardingMessageState);
  const variant = useAtomValue(onboardingVariantState);
  const isVisible = useAtomValue(onboardingMessageVisibleState);
  const setIsVisible = useSetAtom(onboardingMessageVisibleState);

  const hideMessage = () => setIsVisible(false);
  const showMessage = () => setIsVisible(true);

  return { title, message, variant, hideMessage, showMessage, isVisible };
};

export default useFeedback;
