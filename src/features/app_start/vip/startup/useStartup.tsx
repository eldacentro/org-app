import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  apiHostState,
  congregationCreateStepState,
  cookiesConsentState,
  isCongAccountCreateState,
  isEmailLinkAuthenticateState,
  isEmailSentState,
  isEncryptionCodeOpenState,
  isUserAccountCreatedState,
  isUserMfaVerifyState,
  isUserSignInState,
  offlineOverrideState,
  userIDState,
} from '@states/app';
import {
  setIsAppLoad,
  setIsEmailLinkAuthenticate,
  setIsEncryptionCodeOpen,
  setIsSetup,
  setUserMfaVerify,
} from '@services/states/app';
import { dbAppSettingsGet } from '@services/dexie/settings';
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

  const [isUserSignIn, setIsUserSignIn] = useAtom(isUserSignInState);

  const setCookiesConsent = useSetAtom(cookiesConsentState);
  const setCongCreate = useSetAtom(isCongAccountCreateState);
  const setCurrentStep = useSetAtom(congregationCreateStepState);
  const setIsUserAccountCreated = useSetAtom(isUserAccountCreatedState);
  const setUserID = useSetAtom(userIDState);

  const isEmailLinkAuth = useAtomValue(isEmailLinkAuthenticateState);
  const isUserMfaVerify = useAtomValue(isUserMfaVerifyState);
  const isUserAccountCreated = useAtomValue(isUserAccountCreatedState);
  const isOfflineOverride = useAtomValue(offlineOverrideState);
  const isEncryptionCodeOpen = useAtomValue(isEncryptionCodeOpenState);
  const isCongCreate = useAtomValue(isCongAccountCreateState);
  const cookiesConsent = useAtomValue(cookiesConsentState);
  const isEmailSent = useAtomValue(isEmailSentState);
  const apiHost = useAtomValue(apiHostState);

  const [isStart, setIsStart] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Ref guard: prevents concurrent runStartupCheck calls caused by settings
  // changing mid-execution (Dexie updates → handlePostLogin useCallback changes
  // → runStartupCheck changes → useEffect re-fires while isStart is still true).
  const startupRunningRef = useRef(false);

  const isEmailLink = searchParams.get('code') !== null;

  const showSignin = useCallback(() => {
    setIsUserSignIn(!isEmailLink);
    setUserMfaVerify(false);
  }, [setIsUserSignIn, isEmailLink]);

  const runStartupCheck = useCallback(async () => {
    if (startupRunningRef.current) return;
    startupRunningRef.current = true;

    try {
      setIsLoading(true);

      if (isOfflineOverride) {
        setIsLoading(false);
        setIsStart(false);
        showSignin();
        return;
      }

      // Fetch the most up-to-date settings directly from Dexie to avoid Jotai asynchronous update race conditions
      const settings = await dbAppSettingsGet();
      console.log('[startup] initial dbAppSettingsGet():', JSON.parse(JSON.stringify(settings)));
      
      const currentCongName = settings?.cong_settings?.cong_name || '';
      const currentCongRole = settings?.user_settings?.cong_role || [];
      const currentCongMasterKey = settings?.cong_settings?.cong_master_key || '';
      const currentCongAccessCode = settings?.cong_settings?.cong_access_code || '';
      const currentCongID = settings?.cong_settings?.cong_id || '';

      if (currentCongName.length === 0) {
        if (isAuthenticated) {
          console.log('[startup] cong_name empty + authenticated → calling handlePostLogin');
          const success = await handlePostLogin(user);
          console.log('[startup] handlePostLogin result:', success);
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

      console.log('[startup] settings before validateMe:', JSON.parse(JSON.stringify(settings)));
      console.log('[startup] apiValidateMe result:', status, result);

      if (isUserAccountCreated) {
        setIsLoading(false);
        setIsUserSignIn(false);
        return;
      }

      if (!isUserAccountCreated && (status === 403 || status === 400)) {
        await userSignOut();
        setIsLoading(false);
        showSignin();
        return;
      }

      // congregation not found -> user not authorized and delete local data
      if (status === 404) {
        if (currentCongID.length === 0) {
          // If the validate-me endpoint returned a user ID, set it!
          if (result && result.id) {
            setUserID(result.id);
          }
          // New user signed in but has no congregation yet -> show Request Access screen
          setIsUserAccountCreated(true);
          setIsLoading(false);
          setIsUserSignIn(false);
          return;
        } else {
          await handleDeleteDatabase();
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
          setCongCreate(true);
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
          setCongCreate(true);
          return;
        }
      }

      if (
        (masterKeyNeeded && currentCongMasterKey.length === 0) ||
        currentCongAccessCode.length === 0
      ) {
        setIsStart(false);
        setIsEncryptionCodeOpen(true);
      }

      setIsStart(false);
      setIsLoading(false);
    } catch (error) {
      showSignin();
      setIsLoading(false);
      console.error(error);
    } finally {
      startupRunningRef.current = false;
    }
  }, [
    isOfflineOverride,
    isUserAccountCreated,
    showSignin,
    setCongCreate,
    setCurrentStep,
    isAuthenticated,
    setIsUserSignIn,
    setIsUserAccountCreated,
    handlePostLogin,
    setUserID,
    user,
  ]);

  useEffect(() => {
    setIsEmailLinkAuthenticate(isEmailLink);
  }, [isEmailLink]);

  useEffect(() => {
    const checkCookiesConsent = async () => {
      const localValue = Boolean(localStorage.getItem('userConsent'));
      setCookiesConsent(localValue);
    };

    checkCookiesConsent();
  }, [setCookiesConsent]);

  useEffect(() => {
    console.log('[vipStartup effect] isAuthLoading:', isAuthLoading, 'cookiesConsent:', cookiesConsent, 'isStart:', isStart, 'isAuthenticated:', isAuthenticated, 'apiHost:', apiHost);
    if (isAuthLoading || apiHost === '') return;

    if (!cookiesConsent) {
      if (!isAuthenticated) {
        setIsUserSignIn(true);
      }
      setIsLoading(false);
      return;
    }

    if (isStart) {
      console.log('[vipStartup effect] calling runStartupCheck');
      runStartupCheck();
    }
  }, [setIsUserSignIn, cookiesConsent, isStart, runStartupCheck, isAuthLoading, isAuthenticated, apiHost]);

  return {
    isUserSignIn,
    isUserMfaVerify,
    isUserAccountCreated,
    isEmailLinkAuth,
    isEncryptionCodeOpen,
    isCongCreate,
    isLoading,
    isEmailSent,
  };
};

export default useStartup;
