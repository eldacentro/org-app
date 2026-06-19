import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import usePwa2 from 'use-pwa2';
import {
  backupDbOpenState,
  demoNoticeOpenState,
  isAboutOpenState,
  isAppLoadState,
  isContactOpenState,
  isDarkThemeState,
  isOnlineState,
  isSupportOpenState,
  navBarOptionsState,
  restoreDbOpenState,
  userConfirmationOpenState,
} from '@states/app';
import { useEffect, useMemo } from 'react';
import { useBreakpoints, useUserAutoLogin } from '@hooks/index';
import { isImportEPUBState, isImportJWOrgState } from '@states/sources';
import { settingsState } from '@states/settings';
import { checkPwaUpdate } from '@services/app';
import logger from '@services/logger/index';

const useRootLayout = () => {
  const location = useLocation();

  const { installPwa, isLoading } = usePwa2();

  const { autoLoginStatus } = useUserAutoLogin();

  const isAppLoad = useAtomValue(isAppLoadState);
  const isOpenContact = useAtomValue(isContactOpenState);
  const isOpenAbout = useAtomValue(isAboutOpenState);
  const isImportJWOrg = useAtomValue(isImportJWOrgState);
  const isImportEPUB = useAtomValue(isImportEPUBState);
  const isUserConfirm = useAtomValue(userConfirmationOpenState);
  const isBackupDb = useAtomValue(backupDbOpenState);
  const isRestoreDb = useAtomValue(restoreDbOpenState);
  const isOpenSupport = useAtomValue(isSupportOpenState);
  const isOnline = useAtomValue(isOnlineState);
  const isDemoNoticeOpen = useAtomValue(demoNoticeOpenState);
  const settings = useAtomValue(settingsState);
  const isDarkTheme = useAtomValue(isDarkThemeState);
  const navBarOptions = useAtomValue(navBarOptionsState);
  const { tablet688Up } = useBreakpoints();

  const isDashboard = location.pathname === '/';

  // The page's NavBarButton actions render as a floating pill bar fixed to
  // the bottom of the screen on mobile (see layouts/bottom_menu). Since it's
  // position:fixed, it overlays content regardless of document flow — pages
  // need bottom clearance so their last item never ends up hidden behind it.
  // Centralized here so individual pages don't each need to remember it.
  const hasFloatingBottomBar = Boolean(navBarOptions.buttons) && !tablet688Up;

  const initialSetupOpen = useMemo(() => {
    return settings.cong_settings.cong_new ?? false;
  }, [settings]);

  useEffect(() => {
    if (import.meta.env.PROD && isOnline) checkPwaUpdate();
  }, [isOnline, location]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        import.meta.env.PROD &&
        isOnline
      ) {
        checkPwaUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOnline]);

  useEffect(() => {
    if (autoLoginStatus !== '') {
      logger.info('app', autoLoginStatus);
    }
  }, [autoLoginStatus]);

  return {
    installPwa,
    isLoading,
    isAppLoad,
    isOpenAbout,
    isOpenContact,
    isImportJWOrg,
    isImportEPUB,
    isUserConfirm,
    isBackupDb,
    isRestoreDb,
    isOpenSupport,
    isDashboard,
    isDemoNoticeOpen,
    initialSetupOpen,
    isDarkTheme,
    hasFloatingBottomBar,
  };
};

export default useRootLayout;
