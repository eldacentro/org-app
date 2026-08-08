import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  apiHostState,
  congregationCreateStepState,
  cookiesConsentState,
  offlineOverrideState,
  userIDState,
  vipOnboardingStepState,
} from '@states/app';
import {
  displaySnackNotification,
  setCongAccountConnected,
  setIsAppLoad,
  setIsSetup,
  setOfflineOverride,
} from '@services/states/app';
import { getTranslation } from '@services/i18n/translation';
import { dbAppSettingsGet } from '@services/dexie/settings';
import { congIDState } from '@states/settings';
import { APP_ROLES, VIP_ROLES } from '@constants/index';
import { handleDeleteDatabase, loadApp, runUpdater } from '@services/app';
import { apiValidateMe } from '@services/api/user';
import { recoverVipSession } from '@services/app/session_recovery';
import { userSignOut } from '@services/firebase/auth';
import useFirebaseAuth from '@hooks/useFirebaseAuth';
import useAuth from '../hooks/useAuth';

const useStartup = () => {
  const [searchParams] = useSearchParams();

  const { isAuthenticated, loading: isAuthLoading, user } = useFirebaseAuth();
  const { handlePostLogin } = useAuth();

  const [step, setStep] = useAtom(vipOnboardingStepState);

  const setCookiesConsent = useSetAtom(cookiesConsentState);
  const setCurrentStep = useSetAtom(congregationCreateStepState);
  const setUserID = useSetAtom(userIDState);

  const isOfflineOverride = useAtomValue(offlineOverrideState);
  const congID = useAtomValue(congIDState);
  const cookiesConsent = useAtomValue(cookiesConsentState);
  const apiHost = useAtomValue(apiHostState);

  const [isStart, setIsStart] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Ref guard: prevents concurrent runStartupCheck calls caused by settings
  // changing mid-execution (Dexie updates → handlePostLogin useCallback changes
  // → runStartupCheck changes → useEffect re-fires while isStart is still true).
  const startupRunningRef = useRef(false);

  // One-shot guard: set to true in the finally block of runStartupCheck, BEFORE
  // startupRunningRef resets to false. Closes the gap between the synchronous ref
  // reset and React committing setIsStart(false) — a window in which a Dexie event
  // (e.g. avatar download) could re-trigger the useEffect and fire a second startup.
  const startupCompletedRef = useRef(false);

  const isEmailLink = searchParams.get('code') !== null;

  const showSignin = useCallback(() => {
    setStep(isEmailLink ? 'email_link_auth' : 'sign_in');
  }, [setStep, isEmailLink]);

  const runStartupCheck = useCallback(async () => {
    if (startupRunningRef.current) return;
    startupRunningRef.current = true;

    try {
      setIsLoading(true);

      // Fetch the most up-to-date settings directly from Dexie to avoid Jotai asynchronous update race conditions
      const settings = await dbAppSettingsGet();
      const currentCongName = settings?.cong_settings?.cong_name || '';
      const currentCongRole = settings?.user_settings?.cong_role || [];
      const currentCongMasterKey =
        settings?.cong_settings?.cong_master_key || '';
      const currentCongAccessCode =
        settings?.cong_settings?.cong_access_code || '';
      const currentCongID = settings?.cong_settings?.cong_id || '';

      if (isOfflineOverride) {
        setIsLoading(false);
        setIsStart(false);
        if (currentCongName.length > 0) {
          setIsSetup(false);
          loadApp();
          setTimeout(() => {
            setIsSetup(false);
            setIsAppLoad(false);
          }, 1000);
        } else {
          showSignin();
        }
        return;
      }

      if (currentCongName.length === 0) {
        if (isAuthenticated) {
          const success = await handlePostLogin(user);
          setIsLoading(false);
          setIsStart(false);
          if (!success) showSignin();
          return;
        }

        setIsLoading(false);
        setIsStart(false);
        showSignin();
        return;
      }

      const approvedRole = currentCongRole.some((role) =>
        APP_ROLES.includes(role)
      );
      const masterKeyNeeded = currentCongRole.some((role) =>
        VIP_ROLES.includes(role)
      );

      if (!approvedRole) {
        setIsLoading(false);
        setIsStart(false);
        showSignin();
        return;
      }

      const allowOpen =
        (masterKeyNeeded &&
          currentCongMasterKey.length > 0 &&
          currentCongAccessCode.length > 0) ||
        (!masterKeyNeeded && currentCongAccessCode.length > 0);

      if (allowOpen) {
        // La cuenta ESTÁ configurada en este dispositivo: hay congregación,
        // rol aprobado y claves locales. Este atajo abre la app sin contactar
        // con el servidor (es lo que permite entrar al instante y sin red),
        // pero antes se saltaba también el único sitio que marcaba la cuenta
        // como conectada — y sin eso `backupEnabled` (isOnline && isConnected
        // && backupAuto) queda apagado, así que NO se sincroniza nada. Quien
        // entraba por aquí dependía de que la revalidación de fondo
        // respondiera; si fallaba (sin red, servidor caído), se quedaba con la
        // sincronización apagada indefinidamente y sin enterarse.
        // La revalidación de fondo (useUserAutoLogin) sigue corriendo y
        // corrige el estado si la sesión ya no vale.
        //
        // Solo con sesión de Firebase viva: sin ella no hay token, así que ni
        // el worker puede subir nada ni la escucha instantánea de Firestore
        // tiene permiso. Marcarlo conectado ahí sería mentir y además apagaría
        // el aviso y el botón de reconectar, que es justo lo que esa persona
        // necesita ver.
        if (isAuthenticated) {
          setCongAccountConnected(true);
        }
        setIsSetup(false);
        await runUpdater();
        loadApp();
        setTimeout(() => {
          setIsSetup(false);
          setIsAppLoad(false);
        }, 1000);

        return;
      }

      let { status, result } = await apiValidateMe();

      if (step === 'request_access') {
        setIsLoading(false);
        return;
      }

      if (status === 403 || status === 400) {
        // ANTES SE CERRABA LA SESIÓN AQUÍ MISMO, y este es el peor sitio
        // posible: el arranque es lo que corre cuando el hermano ABRE la app,
        // o sea justo el momento en el que se queja de que «se le desconecta la
        // cuenta al entrar».
        //
        // Cerrar sesión destruye la sesión de Firebase, y sin ella el botón de
        // «Reconectar» ya no tiene nada que refrescar: solo queda volver a
        // entrar desde cero, que es lo que un hermano mayor no va a hacer.
        //
        // El decir que «ya no hay nada que reintentar porque apiFetch renueva
        // el token» era verdad solo para UN motivo de los cuatro. `apiFetch`
        // reintenta con token nuevo ante 401 y ante 403 LOGIN_FIRST; si ese
        // reintento vuelve a fallar porque el SERVIDOR no puede verificar nada
        // —se acaba de reiniciar y no tiene todavía las claves públicas de
        // Google—, esto cerraba la sesión de la congregación entera a la vez.
        // Es exactamente el incidente del 2026-08-05. Y un `DEVICE_REVOKED`
        // (Safari purga la cookie de sesión cada pocos días por su cuenta) se
        // repone solo, sin que nadie tenga que hacer nada.
        //
        // El 400 tampoco es terminal: `INPUT_INVALID` es de hecho uno de los
        // códigos que el propio sincronizador trata como token recuperable, y
        // aquí cerraba la sesión SIN decir ni una palabra.
        //
        // Mismo criterio que la revalidación de fondo, ahora también aquí. Ver
        // `session_recovery`.
        const motivo = result?.message ?? String(status);

        const verdict = await recoverVipSession(motivo);

        if (verdict === 'recovered') {
          // Sesión repuesta sin que nadie note nada: se vuelve a preguntar UNA
          // vez, ya con la cookie puesta. No se re-llama a `runStartupCheck`
          // porque tiene un candado contra llamadas concurrentes que dejaría la
          // segunda sin efecto.
          ({ status, result } = await apiValidateMe());
        }

        if (verdict !== 'terminal' && status !== 200) {
          // No se ha podido AHORA. No se toca NADA: ni la sesión, ni los datos,
          // ni se manda a nadie a la pantalla de acceso. `useAutoReconnect`
          // sigue intentándolo por su cuenta y el hermano puede seguir
          // trabajando con lo que ya tiene en el dispositivo.
          //
          // Se es DELIBERADAMENTE conservador: cualquier cosa que no sea un
          // veredicto terminal se trata como «ahora no se puede», nunca como
          // «vuelve a entrar». Los dos errores no cuestan lo mismo — dejar la
          // sesión puesta de más significa ver datos de hace un rato y un aviso;
          // cerrarla de menos significa un hermano mayor fuera de la app hasta
          // que alguien se siente con él a volver a entrar.
          setOfflineOverride(true);
          setIsLoading(false);
          return;
        }
      }

      if (status === 403 || status === 400) {
        // Terminal de verdad: la cuenta ya no existe, o alguien revocó este
        // dispositivo a propósito. Aquí sí toca volver a entrar, diciéndolo.
        if (status === 403) {
          displaySnackNotification({
            header: getTranslation({ key: 'tr_eldaSessionExpiredTitle' }),
            message: getTranslation({ key: 'tr_eldaSessionExpiredDesc' }),
          });
        }

        await userSignOut();
        setIsLoading(false);
        showSignin();
        return;
      }

      // congregation not found → user not authorized and delete local data
      if (status === 404) {
        if (currentCongID.length === 0) {
          // If the validate-me endpoint returned a user ID, set it!
          if (result && result.id) {
            setUserID(result.id);
          }
          // New user signed in but has no congregation yet → show Request Access screen
          setStep('request_access');
          setIsLoading(false);
          return;
        } else {
          // We have a local congregation ID but the server returned 404.
          // This can happen transiently right after the Handshake: the loginUser
          // endpoint already updated the in-memory user but validate-me is called
          // milliseconds later by a separate React render cycle. In this case we
          // should NOT wipe the local DB. Show the encryption screen so the user
          // can proceed; if the cong truly disappeared, the user will see an error
          // when they try to decrypt.
          setStep('encryption_code');
          setIsLoading(false);
          setIsStart(false);
          return;
        }
      }

      // Exigiendo un identificador de verdad: si un 200 llegara con el campo
      // vacío, "distinto" se cumpliría y se borraría la base local por nada.
      if (
        currentCongID.length > 0 &&
        typeof result.cong_id === 'string' &&
        result.cong_id.length > 0 &&
        result.cong_id !== currentCongID
      ) {
        await handleDeleteDatabase();
        return;
      }

      const remoteMasterKey = result.cong_master_key || '';
      const remoteAccessCode = result.cong_access_code || '';

      if (
        isAuthenticated &&
        (remoteMasterKey.length === 0 || remoteAccessCode.length === 0)
      ) {
        if (masterKeyNeeded && remoteMasterKey.length === 0) {
          setCurrentStep(1);
          setIsLoading(false);
          setIsStart(false);
          setStep('cong_create');
          return;
        }

        if (
          masterKeyNeeded &&
          remoteMasterKey.length > 0 &&
          remoteAccessCode.length === 0
        ) {
          setCurrentStep(2);
          setIsLoading(false);
          setIsStart(false);
          setStep('cong_create');
          return;
        }
      }

      if (
        (masterKeyNeeded && currentCongMasterKey.length === 0) ||
        currentCongAccessCode.length === 0
      ) {
        setIsStart(false);
        setStep('encryption_code');
      }

      setIsStart(false);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      if (congID && congID.length > 0) {
        setOfflineOverride(true);
        setIsStart(false);
        setIsSetup(false);
        loadApp();
        setTimeout(() => {
          setIsSetup(false);
          setIsAppLoad(false);
        }, 1000);
      } else {
        showSignin();
      }
      setIsLoading(false);
    } finally {
      // Mark completed BEFORE releasing the running lock. This closes the gap
      // between startupRunningRef becoming false and React committing setIsStart(false),
      // preventing a spurious second invocation (e.g. triggered by the avatar Dexie write).
      startupCompletedRef.current = true;
      startupRunningRef.current = false;
    }
  }, [
    isOfflineOverride,
    step,
    showSignin,
    setStep,
    setCurrentStep,
    isAuthenticated,
    handlePostLogin,
    setUserID,
    user,
    congID,
  ]);

  // Reactively show the email-link-auth screen whenever the URL carries a
  // pending ?code= param. Doesn't reset back to 'none' when the param is
  // absent — leaving that to whichever explicit transition moves the user
  // off this screen — so it can't clobber an unrelated step that's already
  // active (e.g. a stale ?code= lingering on browser back/forward).
  useEffect(() => {
    if (isEmailLink) setStep('email_link_auth');
  }, [isEmailLink, setStep]);

  useEffect(() => {
    const checkCookiesConsent = async () => {
      const localValue = Boolean(localStorage.getItem('userConsent'));
      setCookiesConsent(localValue);
    };

    checkCookiesConsent();
  }, [setCookiesConsent]);

  useEffect(() => {
    if (isAuthLoading || apiHost === '') return;

    if (!cookiesConsent) {
      if (!isAuthenticated) {
        setStep('sign_in');
      }
      setIsLoading(false);
      return;
    }

    if (isStart && !startupCompletedRef.current) {
      runStartupCheck();
    }
  }, [
    setStep,
    cookiesConsent,
    isStart,
    runStartupCheck,
    isAuthLoading,
    isAuthenticated,
    apiHost,
  ]);

  return {
    isUserSignIn: step === 'sign_in',
    isUserMfaVerify: step === 'mfa_verify',
    // Defense-in-depth: if the congregation is already known (Handshake ran and
    // saved cong_id), never render UserAccountCreated regardless of step.
    isUserAccountCreated: step === 'request_access' && !congID,
    isEmailLinkAuth: step === 'email_link_auth',
    isEncryptionCodeOpen: step === 'encryption_code',
    isCongCreate: step === 'cong_create',
    isLoading,
    isEmailSent: step === 'email_sent',
  };
};

export default useStartup;
