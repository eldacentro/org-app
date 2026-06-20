import { useCallback } from 'react';
import { User } from 'firebase/auth';
import { useSetAtom } from 'jotai';
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
import { dbAppSettingsGet, dbAppSettingsUpdate } from '@services/dexie/settings';
import { NextStepType } from './index.types';
import { settingSchema } from '@services/dexie/schema';
import { apiSendAuthorization } from '@services/api/user';
import {
  displaySnackNotification,
  setCongAccountConnected,
  setIsAppLoad,
  setOfflineOverride,
} from '@services/states/app';
import { getMessageByCode, getTranslation } from '@services/i18n/translation';
import { loadApp, runUpdater } from '@services/app';
import { decryptAccessCodeFromInvite } from '@services/encryption/deterministic';
import { loadKeysSecurely, saveKeysSecurely } from '@services/secure_storage';

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
  const setSettings = useSetAtom(settingsState);

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

      if (!app_settings) {
        return nextStep;
      }

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

      // Handshake (VIP o no-VIP): el servidor provisionó el código de acceso
      // en claro (vía invitación descifrada en handlePostLogin).
      // DEBE ir antes de TODOS los checks de createCongregation porque:
      //   - VIP: remoteMasterKey siempre está vacío (E2E), dispararía paso 1
      //   - no-VIP: cong_access_code puede venir vacío en el payload, dispararía paso 2
      // VIP   → encryption = true  (pantalla de clave maestra solamente)
      // no-VIP → encryption = false (entra directo, código ya guardado en Dexie)
      if (cong_settings.cong_access_code_plain) {
        nextStep.encryption = masterKeyNeeded ? true : false;
        return nextStep;
      }

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
      { app_settings, code, user: backendUser }: UserLoginResponseType,
      nextStep: NextStepType
    ) => {
      // Sincronizar átomos de Jotai de inmediato para evitar Race Conditions en el router
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
        setIsEmailSent(false);
        setIsEmailAuth(false);
        setIsUserSignIn(false);
        setIsCongCreate(false);
        setIsUserAccountCreated(false);
        setIsUnauthorizedRole(false);
      }

      if (nextStep.encryption === true) {
        setIsEmailSent(false);
        setIsEmailAuth(false);
        setIsUserSignIn(false);
        setIsCongCreate(false);
        setIsUserAccountCreated(false);
        setIsUnauthorizedRole(false);
        setIsEncryptionCodeOpen(true);
      }

      // Lee directamente de Dexie para no cerrar sobre settingsState y así
      // evitar que este callback se regenere en cada escritura a la BD,
      // lo que causaba una cascada reactiva que re-disparaba runStartupCheck.
      const freshSettings = await dbAppSettingsGet();

      if (app_settings) {
        // Prefer backend's Personas-sourced name (user.firstname) over the account
        // name that may carry the Google displayName (app_settings.user_settings.firstname).
        const now = new Date().toISOString();
        const firstnameToSave = backendUser?.firstname
          ? { value: backendUser.firstname, updatedAt: now }
          : app_settings.user_settings.firstname;
        const lastnameToSave = backendUser?.lastname
          ? { value: backendUser.lastname, updatedAt: now }
          : app_settings.user_settings.lastname;

        await dbAppSettingsUpdate({
          'user_settings.account_type': app_settings.user_settings.role === 'pocket' ? 'pocket' : 'vip',
          'user_settings.lastname': lastnameToSave,
          'user_settings.firstname': firstnameToSave,
        });

        setSettings((prev) => {
          const next = structuredClone(prev);
          next.user_settings.account_type = app_settings.user_settings.role === 'pocket' ? 'pocket' : 'vip';
          next.user_settings.lastname = lastnameToSave;
          next.user_settings.firstname = firstnameToSave;
          return next;
        });
      }

      if (nextStep.isVerifyMFA) {
        // Estado actualizado al inicio de la función
      }

      if (nextStep.createCongregation) {
        // Estado actualizado al inicio de la función
      }

      if (nextStep.encryption === false) {
        const midweekMeeting = structuredClone(
          freshSettings?.cong_settings?.midweek_meeting ?? []
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
          freshSettings?.cong_settings?.weekend_meeting ?? []
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
          ...(app_settings.user_settings.user_local_uid
            ? { 'user_settings.user_local_uid': app_settings.user_settings.user_local_uid }
            : {}),
          'cong_settings.cong_location': app_settings.cong_settings.cong_location,
          'cong_settings.cong_circuit': app_settings.cong_settings.cong_circuit,
          'cong_settings.midweek_meeting': midweekMeeting,
          'cong_settings.weekend_meeting': weekendMeeting,
          'cong_settings.cong_new': false,
          ...(app_settings.cong_settings.cong_access_code_plain
            ? {
                'cong_settings.cong_access_code':
                  app_settings.cong_settings.cong_access_code_plain,
              }
            : {}),
        });

        setSettings((prev) => {
          const next = structuredClone(prev);
          next.cong_settings.country_code = app_settings.cong_settings.country_code;
          next.cong_settings.cong_id = app_settings.cong_settings.id;
          next.cong_settings.cong_name = app_settings.cong_settings.cong_name;
          next.user_settings.cong_role = app_settings.user_settings.cong_role;
          if (app_settings.user_settings.user_local_uid) {
            next.user_settings.user_local_uid = app_settings.user_settings.user_local_uid;
          }
          next.cong_settings.cong_location = app_settings.cong_settings.cong_location;
          next.cong_settings.cong_circuit = app_settings.cong_settings.cong_circuit;
          next.cong_settings.midweek_meeting = midweekMeeting;
          next.cong_settings.weekend_meeting = weekendMeeting;
          next.cong_settings.cong_new = false;
          if (app_settings.cong_settings.cong_access_code_plain) {
            next.cong_settings.cong_access_code = app_settings.cong_settings.cong_access_code_plain;
          }
          return next;
        });

        // Estado de router actualizado al inicio de la función

        await runUpdater();
        loadApp();
        setIsSetup(false);

        setTimeout(() => {
          setOfflineOverride(false);
          setCongAccountConnected(true);
          setIsAppLoad(false);
        }, 2000);
      }

      if (nextStep.encryption === true) {
        const midweekMeeting = structuredClone(
          freshSettings?.cong_settings?.midweek_meeting ?? []
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
          freshSettings?.cong_settings?.weekend_meeting ?? []
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
          (freshSettings?.cong_settings?.cong_id) || app_settings.cong_settings.id;

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
          // Handshake VIP: save the decrypted access code so CongregationEncryption
          // only needs to ask for the master key, not both keys.
          ...(app_settings.cong_settings.cong_access_code_plain
            ? { 'cong_settings.cong_access_code': app_settings.cong_settings.cong_access_code_plain }
            : {}),
        });

        setSettings((prev) => {
          const next = structuredClone(prev);
          next.cong_settings.country_code = app_settings.cong_settings.country_code;
          next.cong_settings.cong_id = congID;
          next.cong_settings.cong_name = app_settings.cong_settings.cong_name;
          next.user_settings.cong_role = app_settings.user_settings.cong_role;
          if (app_settings.user_settings.user_local_uid) {
            next.user_settings.user_local_uid = app_settings.user_settings.user_local_uid;
          }
          next.cong_settings.cong_location = app_settings.cong_settings.cong_location;
          next.cong_settings.cong_circuit = app_settings.cong_settings.cong_circuit;
          next.cong_settings.midweek_meeting = midweekMeeting;
          next.cong_settings.weekend_meeting = weekendMeeting;
          next.cong_settings.cong_new = false;
          if (app_settings.cong_settings.cong_access_code_plain) {
            next.cong_settings.cong_access_code = app_settings.cong_settings.cong_access_code_plain;
          }
          return next;
        });

        // Estado de router actualizado al inicio de la función
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
      setIsSetup,
      setSettings,
      // 'settings' eliminado intencionalmente: se lee fresco desde Dexie al inicio
      // de la función para romper la cascada reactiva Dexie→Jotai→useCallback→useEffect.
    ]
  );

  const handlePostLogin = useCallback(async (user?: User): Promise<boolean> => {
    try {
      setIsAuthProcessing(true);

      const { status, data } = await apiSendAuthorization(user);

      if (status !== 200) {
        await handleAuthorizationError(data.message);
        return false;
      }

      // --- SILENT AUTO-LOGIN HANDSHAKE INJECTION ---
      // Si el servidor interceptó una invitación y asignó la congregación,
      // vendrá con el código de acceso encriptado. Lo desencriptamos ahora.
      if (data?.app_settings?.cong_settings?.encrypted_access_code && user?.email) {
        try {
          const decryptedCode = await decryptAccessCodeFromInvite(
            data.app_settings.cong_settings.encrypted_access_code,
            user.email
          );
          // Lo inyectamos como texto plano para que determineNextStep sepa
          // que no es necesario pedir la clave (encryption = false).
          data.app_settings.cong_settings.cong_access_code_plain = decryptedCode;

          // Lo guardamos silenciosamente en Secure Storage de inmediato
          if (data.id) {
            const existingKeys = await loadKeysSecurely(data.id);
            await saveKeysSecurely(data.id, existingKeys?.masterKey || '', decryptedCode);
          }
        } catch (err) {
          console.error('[handlePostLogin] decrypt FAILED:', err);
        }
      }

      const nextStep: NextStepType = determineNextStep(
        data as UserLoginResponseType
      );

      if (
        nextStep.isVerifyMFA ||
        nextStep.encryption !== undefined ||
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
