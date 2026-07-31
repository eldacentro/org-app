import { useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import {
  apiHostState,
  congAccountConnectedState,
  congPrefixState,
  isAppLoadState,
  isMFAEnabledState,
  isOnlineState,
  isSetupState,
  offlineOverrideState,
  userIDState,
} from '@states/app';
import { apiValidateMe } from '@services/api/user';
import { userSignOut } from '@services/firebase/auth';
import { handleDeleteDatabase } from '@services/app';
import { shouldResetLocalData } from '@services/app/account_guard';
import { APP_ROLES, isTest, VIP_ROLES } from '@constants/index';
import { accountTypeState, congIDState } from '@states/settings';
import useFirebaseAuth from '@hooks/useFirebaseAuth';
import logger from '@services/logger/index';
import worker from '@services/worker/backupWorker';
import { apiPocketValidateMe } from '@services/api/pocket';
import { displaySnackNotification } from '@services/states/app';
import { IconInfo } from '@components/icons';
import { useAppTranslation } from '.';
import {
  dbAppSettingsGet,
  dbAppSettingsUpdate,
  dbAppSettingsUpdateWithoutNotice,
} from '@services/dexie/settings';

// Reparte el primer sync tras iniciar sesión en una ventana de unos
// segundos en vez de dispararlo en el mismo instante para todos — si muchos
// dispositivos abren la app casi a la vez (típico justo después de un
// despliegue), antes todos mandaban su primera sincronización exactamente
// al mismo tiempo, un patrón de tráfico "en bloque" que puede leerse como
// sospechoso para sistemas de detección de abuso. La demora es corta
// (máx. 8s) para no notarse como un retraso real en el primer sync.
const FIRST_SYNC_JITTER_MS = 8000;
const startWorkerWithJitter = () => {
  const jitter = Math.random() * FIRST_SYNC_JITTER_MS;
  setTimeout(() => worker.postMessage('startWorker'), jitter);
};

const useUserAutoLogin = () => {
  const { isAuthenticated, user } = useFirebaseAuth();

  const { t } = useAppTranslation();

  const setCongConnected = useSetAtom(congAccountConnectedState);
  const setUserID = useSetAtom(userIDState);
  const setCongPrefix = useSetAtom(congPrefixState);
  const setIsMFAEnabled = useSetAtom(isMFAEnabledState);
  const setOfflineOverride = useSetAtom(offlineOverrideState);
  const setIsSetup = useSetAtom(isSetupState);
  const setIsAppLoad = useSetAtom(isAppLoadState);

  const isOnline = useAtomValue(isOnlineState);
  const apiHost = useAtomValue(apiHostState);
  const isAppLoad = useAtomValue(isAppLoadState);
  const accountType = useAtomValue(accountTypeState);
  const congID = useAtomValue(congIDState);

  const runFetchVip = useMemo(() => {
    return (
      !isTest &&
      apiHost !== '' &&
      accountType === 'vip' &&
      !isAppLoad &&
      isOnline &&
      isAuthenticated
    );
  }, [accountType, apiHost, isAppLoad, isAuthenticated, isOnline]);

  const runFetchPocket = useMemo(() => {
    return (
      !isTest &&
      apiHost !== '' &&
      accountType === 'pocket' &&
      !isAppLoad &&
      isOnline
    );
  }, [accountType, apiHost, isAppLoad, isOnline]);

  const {
    isPending: isPendingVip,
    data: dataVip,
    error: errorVip,
  } = useQuery({
    queryKey: ['whoami-vip'],
    queryFn: apiValidateMe,
    enabled: runFetchVip,
    refetchOnWindowFocus: 'always',
  });

  const {
    isPending: isPendingPocket,
    data: dataPocket,
    error: errorPocket,
  } = useQuery({
    queryKey: ['whoami-pocket'],
    queryFn: apiPocketValidateMe,
    enabled: runFetchPocket,
    refetchOnWindowFocus: 'always',
  });

  const [autoLoginStatus, setAutoLoginStatus] = useState('');

  useEffect(() => {
    const handleLoginData = async () => {
      try {
        setAutoLoginStatus('auto login process started');

        if (isPendingVip) return;

        if (!dataVip) return;

        if (dataVip.status === 403) {
          // Llegados aquí la sesión no se puede recuperar sola: el token
          // caducado (LOGIN_FIRST) ya se reintentó con uno nuevo en apiFetch, y
          // un DEVICE_REVOKED (cookie de sesión perdida — Safari la purga por
          // su cuenta) solo se arregla volviendo a entrar. Antes esto pasaba en
          // silencio: aparecía la pantalla de acceso sin ninguna explicación.
          // No se borra nada: las claves siguen guardadas y los datos locales
          // también, así que volver a entrar lo deja todo como estaba.
          logger.error(
            'app',
            `vip session rejected: ${dataVip?.result?.message ?? '403'}`
          );

          displaySnackNotification({
            header: t('tr_eldaSessionExpiredTitle'),
            message: t('tr_eldaSessionExpiredDesc'),
            icon: <IconInfo color="var(--white)" />,
          });

          await userSignOut();
          return;
        }

        // congregation not found -> user not authorized and delete local data
        if (dataVip.status === 404) {
          // Nunca por una sola respuesta: se vuelve a preguntar antes de
          // destruir la base local (ver account_guard).
          const confirmed = await shouldResetLocalData({
            accountType: 'vip',
            reason: 'vip validate-me 404',
            message: dataVip?.result?.message,
          });

          if (!confirmed) {
            setOfflineOverride(true);
            return;
          }

          await handleDeleteDatabase();
          return;
        }

        if (errorVip || dataVip?.result?.message || dataVip?.status >= 500) {
          const msg =
            errorVip?.message || dataVip?.result?.message || 'Network Error';
          logger.error('app', msg);
          setOfflineOverride(true);
          return;
        }

        if (dataVip && dataVip.status === 200) {
          // Cambio de congregación → se borra lo local, que es lo correcto.
          // Pero exigiendo que el servidor haya mandado un identificador de
          // verdad: si algún día un 200 llegara con el campo vacío o a medias,
          // la comparación "distinto" se cumpliría y TODOS los dispositivos
          // borrarían su base de datos a la vez.
          const remoteCongID = dataVip.result.cong_id;

          if (
            congID.length > 0 &&
            typeof remoteCongID === 'string' &&
            remoteCongID.length > 0 &&
            remoteCongID !== congID
          ) {
            await handleDeleteDatabase();
            return;
          }

          const remoteRoles = dataVip.result.cong_role;

          // Igual aquí: sin lista de roles no se concluye nada. Que llegue
          // vacía no es prueba de que a nadie le hayan quitado el acceso —
          // cuando eso pasa de verdad, validate-me responde 404 y ese camino
          // sí borra (con su confirmación).
          if (!Array.isArray(remoteRoles) || remoteRoles.length === 0) {
            logger.error('app', 'validate-me returned no roles: ignoring');
            return;
          }

          const approvedRole = remoteRoles.some((role) =>
            APP_ROLES.includes(role)
          );

          if (!approvedRole) {
            await handleDeleteDatabase();
            return;
          }

          if (approvedRole) {
            const settings = await dbAppSettingsGet();

            const prevRole = settings.user_settings.cong_role;
            const checkRole = prevRole.length > 0;

            const prevNeedMasterKey = prevRole.some((role) =>
              VIP_ROLES.includes(role)
            );

            const newRole = dataVip.result.cong_role;
            const newNeedMasterKey = newRole.some((role) =>
              VIP_ROLES.includes(role)
            );

            if (checkRole && !prevNeedMasterKey && newNeedMasterKey) {
              displaySnackNotification({
                header: t('tr_userRoleChanged'),
                message: t('tr_userRoleChangedDesc'),
                icon: <IconInfo color="var(--white)" />,
              });

              await dbAppSettingsUpdate({
                'cong_settings.cong_master_key': '',
              });

              await userSignOut();

              setCongConnected(false);
              setIsAppLoad(true);
              setOfflineOverride(true);

              setTimeout(() => {
                setIsSetup(true);
              }, 5000);

              return;
            }

            if (prevNeedMasterKey && !newNeedMasterKey) {
              await handleDeleteDatabase();

              return;
            }

            const proceed =
              !prevNeedMasterKey || prevNeedMasterKey === newNeedMasterKey;

            if (proceed) {
              await dbAppSettingsUpdateWithoutNotice({
                'user_settings.id': dataVip.result.id,
                'cong_settings.country_code': dataVip.result.country_code,
                'cong_settings.cong_name': dataVip.result.cong_name,
                'user_settings.cong_role': dataVip.result.cong_role,
                'cong_settings.cong_id': dataVip.result.cong_id,
              });

              setUserID(dataVip.result.id);
              setCongConnected(true);
              setIsMFAEnabled(dataVip.result.mfa);
              setCongPrefix(dataVip.result.cong_prefix);

              worker.postMessage({
                field: 'userID',
                value: dataVip.result.id,
              });

              worker.postMessage({ field: 'accountType', value: 'vip' });

              // Pass idToken immediately so the first sync runs without waiting
              // for the periodic timer (which fires every ~5 min). Without this,
              // VIP users see "Sincronizando" indefinitely on first load or when
              // backup_automatic.enabled is false.
              if (user) {
                try {
                  const idToken = await user.getIdToken(true);
                  if (idToken?.length > 0) {
                    worker.postMessage({ field: 'idToken', value: idToken });
                  }
                } catch {
                  // Non-critical — timer will retry with fresh token
                }
              }

              startWorkerWithJitter();
            }
          }

          setAutoLoginStatus('auto login process completed');
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (accountType === 'vip') {
      handleLoginData();
    }
  }, [
    t,
    accountType,
    isPendingVip,
    dataVip,
    errorVip,
    setCongConnected,
    setUserID,
    setIsMFAEnabled,
    setIsAppLoad,
    setIsSetup,
    setOfflineOverride,
    congID,
    setCongPrefix,
    user,
  ]);

  useEffect(() => {
    const handleLoginData = async () => {
      try {
        if (isPendingPocket) return;

        if (!dataPocket) return;

        setAutoLoginStatus('auto login process started');

        // congregation not found -> user not authorized and delete local data
        if (dataPocket.status === 403) {
          // El caso peligroso: en una cuenta pocket la sesión ES la cookie del
          // dispositivo, y Safari la purga por su cuenta (ITP). Eso devuelve
          // DEVICE_REVOKED, que antes borraba la base local entera sin
          // preguntar — perdiendo de paso lo que aún no se hubiera subido.
          const confirmed = await shouldResetLocalData({
            accountType: 'pocket',
            reason: 'pocket validate-me 403',
            message: dataPocket?.result?.message,
          });

          if (!confirmed) {
            setOfflineOverride(true);
            return;
          }

          await handleDeleteDatabase();
          return;
        }

        if (
          errorPocket ||
          dataPocket?.result?.message ||
          dataPocket?.status >= 500
        ) {
          const msg =
            errorPocket?.message ||
            dataPocket?.result?.message ||
            'Network Error';
          logger.error('app', msg);
          setOfflineOverride(true);
          return;
        }

        if (dataPocket && dataPocket.status === 200) {
          // Mismas cautelas que en el camino VIP: no se borra nada por un
          // identificador vacío ni por una lista de roles que no ha llegado.
          const remoteCongID =
            dataPocket.result.app_settings?.cong_settings?.id;

          if (
            congID.length > 0 &&
            typeof remoteCongID === 'string' &&
            remoteCongID.length > 0 &&
            remoteCongID !== congID
          ) {
            await handleDeleteDatabase();
            return;
          }

          const remoteRoles =
            dataPocket.result.app_settings?.user_settings?.cong_role;

          if (!Array.isArray(remoteRoles) || remoteRoles.length === 0) {
            logger.error(
              'app',
              'pocket validate-me returned no roles: ignoring'
            );
            return;
          }

          const approvedRole = remoteRoles.some((role) =>
            APP_ROLES.includes(role)
          );

          if (!approvedRole) {
            await handleDeleteDatabase();
            return;
          }

          if (approvedRole) {
            await dbAppSettingsUpdateWithoutNotice({
              'user_settings.id': dataPocket.result.id,
            });

            setUserID(dataPocket.result.id);
            setCongConnected(true);

            worker.postMessage({
              field: 'userID',
              value: dataPocket.result.id,
            });

            worker.postMessage({ field: 'accountType', value: 'pocket' });

            startWorkerWithJitter();
          }

          setAutoLoginStatus('auto login process completed');
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (accountType === 'pocket') {
      handleLoginData();
    }
  }, [
    accountType,
    isPendingPocket,
    dataPocket,
    errorPocket,
    setCongConnected,
    setUserID,
    setIsMFAEnabled,
    setOfflineOverride,
    congID,
  ]);

  return { autoLoginStatus };
};

export default useUserAutoLogin;
