import { useCallback } from 'react';
import { User } from 'firebase/auth';
import { useAtomValue, useSetAtom } from 'jotai';
import { UserLoginResponseType } from '@definition/api';
import { APP_ROLES, VIP_ROLES } from '@constants/index';
import {
  congregationCreateStepState,
  isAuthProcessingState,
  isCongAccountCreateState,
  isEmailLinkAuthenticateState,
  isEmailSentState,
  isEncryptionCodeOpenState,
  isSetupState,
  isUnauthorizedRoleState,
  isUserAccountCreatedState,
  isUserMfaVerifyState,
  isUserSignInState,
  tokenDevState,
  userIDState,
} from '@states/app';
import { settingsState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { NextStepType } from './index.types';
import { settingSchema } from '@services/dexie/schema';
import { apiSendAuthorization } from '@services/api/user';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode, getTranslation } from '@services/i18n/translation';

const useAuth = () => {
  const setIsSetup = useSetAtom(isSetupState);
  const setIsUserSignIn = useSetAtom(isUserSignInState);
  const setVerifyMFA = useSetAtom(isUserMfaVerifyState);
  const setTokenDev = useSetAtom(tokenDevState);
  const setIsUserAccountCreated = useSetAtom(isUserAccountCreatedState);
  const setIsEmailAuth = useSetAtom(isEmailLinkAuthenticateState);
  const setCurrentStep = useSetAtom(congregationCreateStepState);
  const setUserID = useSetAtom(userIDState);
  const setIsUnauthorizedRole = useSetAtom(isUnauthorizedRoleState);
  const setIsEncryptionCodeOpen = useSetAtom(isEncryptionCodeOpenState);
  const setIsEmailSent = useSetAtom(isEmailSentState);
  const setIsCongCreate = useSetAtom(isCongAccountCreateState);
  const setIsAuthProcessing = useSetAtom(isAuthProcessingState);

  const settings = useAtomValue(settingsState);

  const handleAuthorizationError = useCallback(async (message: string) => {
    displaySnackNotification({
      header: getTranslation({ key: 'tr_errorTitle' }),
      message: getMessageByCode(message),
      severity: 'error',
    });

    setIsAuthProcessing(false);
  }, [setIsAuthProcessing]);

  const handleUnauthorizedUser = useCallback(() => {
    setIsEmailSent(false);
    setIsUserAccountCreated(false);
    setIsUnauthorizedRole(true);
  }, [setIsEmailSent, setIsUserAccountCreated, setIsUnauthorizedRole]);

  const determineNextStep = useCallback(
    ({ app_settings, message, id }: UserLoginResponseType): NextStepType => {
      setUserID(id);

      const nextStep: NextStepType = {};

      if (message === 'MFA_VERIFY') {
        nextStep.isVerifyMFA = true;
        return nextStep;
      }

      if (!app_settings) return nextStep;

      const { user_settings, cong_settings } = app_settings;

      if (!cong_settings) {
        nextStep.createCongregation = true;
        return nextStep;
      }

      if (!user_settings.cong_role || user_settings.cong_role?.length === 0) {
        nextStep.unauthorized = true;
        return nextStep;
      }

      const approvedRole = user_settings.cong_role.some((role) =>
        APP_ROLES.includes(role)
      );

      if (!approvedRole) {
        nextStep.unauthorized = true;
        return nextStep;
      }

      // If user is pocket, skip encryption and enter directly
      if (user_settings.role === 'pocket') {
        nextStep.encryption = false;
        return nextStep;
      }

      const remoteMasterKey = cong_settings.cong_master_key;
      const remoteAccessCode = cong_settings.cong_access_code;
      const masterKeyNeeded = user_settings.cong_role.some((role) =>
        VIP_ROLES.includes(role)
      );

      if (masterKeyNeeded && remoteMasterKey.length === 0) {
        setCurrentStep(1);
        nextStep.createCongregation = true;
        return nextStep;
      }

      if (remoteAccessCode.length === 0) {
        setCurrentStep(2);
        nextStep.createCongregation = true;
        return nextStep;
      }

      nextStep.encryption = true;
      return nextStep;
    },
    [setCurrentStep, setUserID]
  );

  const updateUserSettings = useCallback(
    async (
      { app_settings, code }: UserLoginResponseType,
      nextStep: NextStepType
    ) => {
      if (app_settings) {
        await dbAppSettingsUpdate({
          'user_settings.account_type': app_settings.user_settings.role === 'pocket' ? 'pocket' : 'vip',
          'user_settings.lastname': app_settings.user_settings.lastname,
          'user_settings.firstname': app_settings.user_settings.firstname,
        });
      }

      if (nextStep.isVerifyMFA) {
        setTokenDev(code);
        setIsEmailAuth(false);
        setIsUserSignIn(false);
        setIsUserAccountCreated(false);
        setIsUnauthorizedRole(false);
        setIsCongCreate(false);
        setVerifyMFA(true);
      }

      if (nextStep.createCongregation) {
        setIsEmailAuth(false);
        setIsEmailSent(false);
        setIsUserSignIn(false);
        setIsCongCreate(false);
        setIsUserAccountCreated(true);
      }

      if (nextStep.encryption === false) {
        // Pocket user entering directly
        const midweekMeeting = structuredClone(
          settings.cong_settings.midweek_meeting
        );

        for (const midweekRemote of app_settings.cong_settings.midweek_meeting) {
          const midweekLocal = midweekMeeting.find(
            (record) => record.type === midweekRemote.type
          );

          if (midweekLocal) {
            midweekLocal.time = midweekRemote.time;
            midweekLocal.weekday = midweekRemote.weekday;
          } else {
            midweekMeeting.push({
              ...settingSchema.cong_settings.midweek_meeting.at(0),
              time: midweekRemote.time,
              type: midweekRemote.type,
              weekday: midweekRemote.weekday,
            });
          }
        }

        const weekendMeeting = structuredClone(
          settings.cong_settings.weekend_meeting
        );

        for (const weekendRemote of app_settings.cong_settings.weekend_meeting) {
          const weekendLocal = weekendMeeting.find(
            (record) => record.type === weekendRemote.type
          );

          if (weekendLocal) {
            weekendLocal.time = weekendRemote.time;
            weekendLocal.weekday = weekendRemote.weekday;
          } else {
            weekendMeeting.push({
              ...settingSchema.cong_settings.weekend_meeting.at(0),
              time: weekendRemote.time,
              type: weekendRemote.type,
              weekday: weekendRemote.weekday,
            });
          }
        }

        await dbAppSettingsUpdate({
          'cong_settings.country_code': app_settings.cong_settings.country_code,
          'cong_settings.cong_id': app_settings.cong_settings.id,
          'cong_settings.cong_name': app_settings.cong_settings.cong_name,
          'user_settings.cong_role': app_settings.user_settings.cong_role,
          'cong_settings.cong_location': app_settings.cong_settings.cong_location,
          'cong_settings.cong_circuit': app_settings.cong_settings.cong_circuit,
          'cong_settings.midweek_meeting': midweekMeeting,
          'cong_settings.weekend_meeting': weekendMeeting,
          'cong_settings.cong_new': false,
        });

        setIsEmailSent(false);
        setIsEmailAuth(false);
        setIsUserSignIn(false);
        setIsCongCreate(false);
        setIsSetup(false); // This will trigger the app load
      }

      if (nextStep.encryption === true) {
        const midweekMeeting = structuredClone(
          settings.cong_settings.midweek_meeting
        );

        for (const midweekRemote of app_settings.cong_settings.midweek_meeting) {
          const midweekLocal = midweekMeeting.find(
            (record) => record.type === midweekRemote.type
          );

          if (midweekLocal) {
            midweekLocal.time = midweekRemote.time;
            midweekLocal.weekday = midweekRemote.weekday;
          } else {
            midweekMeeting.push({
              ...settingSchema.cong_settings.midweek_meeting.at(0),
              time: midweekRemote.time,
              type: midweekRemote.type,
              weekday: midweekRemote.weekday,
            });
          }
        }

        const weekendMeeting = structuredClone(
          settings.cong_settings.weekend_meeting
        );

        for (const weekendRemote of app_settings.cong_settings.weekend_meeting) {
          const weekendLocal = weekendMeeting.find(
            (record) => record.type === weekendRemote.type
          );

          if (weekendLocal) {
            weekendLocal.time = weekendRemote.time;
            weekendLocal.weekday = weekendRemote.weekday;
          } else {
            weekendMeeting.push({
              ...settingSchema.cong_settings.weekend_meeting.at(0),
              time: weekendRemote.time,
              type: weekendRemote.type,
              weekday: weekendRemote.weekday,
            });
          }
        }

        const congID =
          settings.cong_settings.cong_id ?? app_settings.cong_settings.id;

        await dbAppSettingsUpdate({
          'cong_settings.country_code': app_settings.cong_settings.country_code,
          'cong_settings.cong_id': congID,
          'cong_settings.cong_name': app_settings.cong_settings.cong_name,
          'user_settings.cong_role': app_settings.user_settings.cong_role,
          'cong_settings.cong_location':
            app_settings.cong_settings.cong_location,
          'cong_settings.cong_circuit': app_settings.cong_settings.cong_circuit,
          'cong_settings.midweek_meeting': midweekMeeting,
          'cong_settings.weekend_meeting': weekendMeeting,
          'cong_settings.cong_new': false,
        });

        setIsEmailSent(false);
        setIsEmailAuth(false);
        setIsUserSignIn(false);
        setIsCongCreate(false);
        setIsEncryptionCodeOpen(true);
      }
    },
    [
      setIsEmailAuth,
      setIsEmailSent,
      setIsUserSignIn,
      setIsCongCreate,
      setIsUserAccountCreated,
      setIsUnauthorizedRole,
      setTokenDev,
      setVerifyMFA,
      setIsEncryptionCodeOpen,
      settings,
    ]
  );

  const handlePostLogin = useCallback(async (user?: User): Promise<boolean> => {
    try {
      setIsAuthProcessing(true);

      console.log('[handlePostLogin] calling apiSendAuthorization...');
      const { status, data } = await apiSendAuthorization(user);
      console.log('[handlePostLogin] status:', status, 'data:', JSON.stringify(data)?.slice(0, 200));

      if (status !== 200) {
        console.error('[handlePostLogin] non-200 response:', status, data?.message);
        await handleAuthorizationError(data.message);
        return false;
      }

      const nextStep: NextStepType = determineNextStep(
        data as UserLoginResponseType
      );

      if (
        nextStep.isVerifyMFA ||
        nextStep.encryption ||
        nextStep.createCongregation
      ) {
        await updateUserSettings(data as UserLoginResponseType, nextStep);
      }

      if (nextStep.unauthorized) {
        handleUnauthorizedUser();
      }

      return true;
    } catch (error) {
      console.error(error);
      await handleAuthorizationError(
        error.code || error.message || 'error_app_generic-desc'
      );
      return false;
    } finally {
      setIsAuthProcessing(false);
    }
  }, [
    setIsAuthProcessing,
    handleAuthorizationError,
    determineNextStep,
    updateUserSettings,
    handleUnauthorizedUser,
  ]);

  return { determineNextStep, updateUserSettings, handlePostLogin };
};

export default useAuth;
