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
  setIsAppLoad,
  setIsSetup,
  setOfflineOverride,
} from '@services/states/app';
import { dbAppSettingsGet } from '@services/dexie/settings';
import { congIDState } from '@states/settings';
import { APP_ROLES, VIP_ROLES } from '@constants/index';
import { handleDeleteDatabase, loadApp, runUpdater } from '@services/app';
import { apiValidateMe } from '@services/api/user';
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
      const currentCongMasterKey = settings?.cong_settings?.cong_master_key || '';
      const currentCongAccessCode = settings?.cong_settings?.cong_access_code || '';
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

      const approvedRole = currentCongRole.some((role) => APP_ROLES.includes(role));
      const masterKeyNeeded = currentCongRole.some((role) => VIP_ROLES.includes(role));

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
        setIsSetup(false);
        await runUpdater();
        loadApp();
        setTimeout(() => {
          setIsSetup(false);
          setIsAppLoad(false);
        }, 1000);

        return;
      }

      const { status, result } = await apiValidateMe();

      if (step === 'request_access') {
        setIsLoading(false);
        return;
      }

      if (status === 403 || status === 400) {
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

      if (currentCongID.length > 0 && result.cong_id !== currentCongID) {
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
  }, [setStep, cookiesConsent, isStart, runStartupCheck, isAuthLoading, isAuthenticated, apiHost]);

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
