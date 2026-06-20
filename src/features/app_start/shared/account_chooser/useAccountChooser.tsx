import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  authProvider,
  setAuthPersistence,
  userSignInPopup,
} from '@services/firebase/auth';
import { isAccountChooseState, isAuthProcessingState } from '@states/app';
import { settingsState } from '@states/settings';
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
  const isAuthProcessing = useAtomValue(isAuthProcessingState);
  const setIsAuthProcessing = useSetAtom(isAuthProcessingState);
  const setSettings = useSetAtom(settingsState);

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
        setSettings((prev) => {
          const next = structuredClone(prev);
          next.user_settings.account_type = 'vip';
          return next;
        });
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

  // Synchronous lock — isAuthProcessing (Jotai) isn't guaranteed to be
  // readable by a second rapid tap before the first call's state update
  // propagates, so a ref is the only thing that reliably blocks a second
  // signInWithPopup from firing while the first is still in flight. Two
  // concurrent popups racing each other is its own source of "stuck on
  // loading after picking the account" reports.
  const inFlightRef = useRef(false);

  const handleChooseGoogle = async () => {
    if (inFlightRef.current) return;

    try {
      hideMessage();

      // Already signed in: this screen is being shown as the post-login
      // fallback, not as a fresh login. Re-running sign-in here would just
      // re-enter the same flow. Instead re-mark the account so VipStartup
      // re-runs its startup check.
      if (isAuthenticated) {
        await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
        setSettings((prev) => {
          const next = structuredClone(prev);
          next.user_settings.account_type = 'vip';
          return next;
        });
        setIsAccountChoose(false);
        return;
      }

      inFlightRef.current = true;

      // signInWithPopup on every platform, mobile included: it must be the
      // first await in this handler so it stays synchronous with the click
      // (any await before it risks the browser treating the popup as
      // programmatic, not user-initiated, and silently blocking it — the
      // most likely reason a tap could appear to do nothing). signInWithRedirect
      // was tried for mobile before and made things worse — it depends on the
      // browser correctly persisting "a redirect is pending" across a full page
      // reload, which Safari's tracking-prevention can interfere with, and it
      // can't be retried without the user noticing a real page navigation.
      // Persistence is fired without awaiting for the same reason; it
      // reliably finishes well before the user picks an account.
      setAuthPersistence().catch(console.error);
      setIsAuthProcessing(true);
      await userSignInPopup(authProvider.Google);
    } catch (error) {
      // User closed the popup or a second popup request superseded this one
      // — not a real error, just let them try again. Still worth a gentle
      // message: silently doing nothing is exactly what makes people tap
      // repeatedly, unsure if anything happened at all.
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        displayOnboardingFeedback({
          title: t('tr_signInCancelledTitle', 'Inicio de sesión cancelado'),
          message: t('tr_signInCancelledDesc', 'Se cerró la ventana de Google antes de terminar. Inténtalo de nuevo.'),
        });
        showMessage();
        return;
      }

      console.error(error);
      displayOnboardingFeedback({
        title: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(
          error.code || error.message || t('error_app_generic-desc')
        ),
      });
      showMessage();
    } finally {
      inFlightRef.current = false;
      setIsAuthProcessing(false);
    }
  };

  return { handleChooseGoogle, isAuthProcessing };
};

export default useAccountChooser;
