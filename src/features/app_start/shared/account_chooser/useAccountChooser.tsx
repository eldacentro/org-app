import { useEffect, useRef } from 'react';
import { authErrorMessage } from '@services/firebase/auth_errors';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  authProvider,
  setAuthPersistence,
  userSignInPopup,
  userSignInRedirect,
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
  const { showMessage, hideMessage, isVisible, title, message, variant } =
    useFeedback();
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
        console.log(
          '[markAccount] isAuthenticated=true → setting account_type=vip'
        );
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
          message: authErrorMessage(error),
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

      // Ya hay sesión: esta pantalla se está enseñando como RESPALDO de un
      // arranque que falló, no como un inicio de sesión nuevo.
      //
      // EL FALLO QUE ESTO ARREGLA, y es el peor de todos los de entrar. Aquí se
      // volvía a marcar la cuenta «para que VipStartup repita su comprobación de
      // arranque». Eso NO ocurría: `runStartupCheck` está detrás de un candado
      // de una sola vez (`startupCompletedRef`) que se echa en su `finally` y no
      // se suelta nunca, y de un `isStart` que solo va a falso. Así que el
      // hermano pulsaba «Continuar con Google» y no pasaba absolutamente nada:
      // ni rueda, ni error, ni avance. Podía pulsarlo veinte veces. La única
      // salida era cerrar la app y volver a abrirla — que es exactamente lo que
      // describe «no puedo entrar» y «a veces entra si insisto mucho».
      //
      // Se recarga, que es lo único que de verdad repite el arranque: refs
      // nuevos, estado nuevo y otra consulta al servidor. Es lo que el hermano
      // acababa haciendo a mano, y el mismo camino que ya usa el botón de
      // «Actualizar» de la pantalla de solicitud de acceso.
      if (isAuthenticated) {
        await dbAppSettingsUpdate({ 'user_settings.account_type': 'vip' });
        setIsAccountChoose(false);

        window.location.reload();
        return;
      }

      inFlightRef.current = true;

      // signInWithPopup must be the first await in this handler so it stays
      // synchronous with the click (any await before it risks the browser
      // treating the popup as programmatic, not user-initiated, and
      // silently blocking it). Persistence is fired without awaiting for
      // the same reason; it reliably finishes well before the user picks
      // an account.
      setAuthPersistence().catch(console.error);
      setIsAuthProcessing(true);
      await userSignInPopup(authProvider.Google);
    } catch (error) {
      // The popup itself is the unreliable part here, not the user: it gets
      // closed (by the OS, by third-party-cookie blocking, by Google's own
      // side giving up if the round trip is slow) well more often than
      // "the user actually meant to cancel," and it surfaces as the exact
      // same auth/popup-closed-by-user regardless of which of those
      // happened. Retrying with signInWithRedirect — a full-page navigation
      // to Google and back, immune to all of that — instead of just asking
      // the user to tap the same broken button again is what actually
      // recovers from this on the SAME attempt.
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await setAuthPersistence();
          await userSignInRedirect(authProvider.Google);
          // Page is navigating away to Google now — nothing left to do here.
          return;
        } catch (redirectError) {
          console.error(redirectError);
          displayOnboardingFeedback({
            title: t('tr_signInCancelledTitle', 'Inicio de sesión cancelado'),
            message: t(
              'tr_signInCancelledDesc',
              'Se cerró la ventana de Google antes de terminar. Inténtalo de nuevo.'
            ),
          });
          showMessage();
          return;
        }
      }

      console.error(error);
      displayOnboardingFeedback({
        title: getMessageByCode('error_app_generic-title'),
        // `getMessageByCode(error.code)` enseñaba el código crudo de Google
        // —«auth/network-request-failed»— porque no hay traducción para ninguno.
        // Ver `authErrorMessage`.
        message: authErrorMessage(error),
      });
      showMessage();
    } finally {
      inFlightRef.current = false;
      setIsAuthProcessing(false);
    }
  };

  return {
    handleChooseGoogle,
    isAuthProcessing,
    isVisible,
    title,
    message,
    variant,
    hideMessage,
  };
};

export default useAccountChooser;
