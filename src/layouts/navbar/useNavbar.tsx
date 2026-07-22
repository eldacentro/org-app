import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import {
  displaySnackNotification,
  setCongAccountConnected,
  setIsAboutOpen,
  setIsContactOpen,
  setIsSupportOpen,
} from '@services/states/app';
import { apiValidateMe } from '@services/api/user';
import { useBreakpoints, useManualSync } from '@hooks/index';
import {
  congAccountConnectedState,
  isAppLoadState,
  navBarAnchorElState,
  navBarOptionsState,
} from '@states/app';
import {
  accountTypeState,
  congNameState,
  fullnameState,
} from '@states/settings';
import { currentAuthUser } from '@services/firebase/auth';

const useNavbar = () => {
  const navigate = useNavigate();

  const { laptopUp, tabletDown, tabletUp, desktopUp, tablet688Up } =
    useBreakpoints();

  const [anchorEl, setAnchorEl] = useAtom(navBarAnchorElState);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const fullname = useAtomValue(fullnameState);
  const congName = useAtomValue(congNameState);
  const isCongAccountConnected = useAtomValue(congAccountConnectedState);
  const isAppLoad = useAtomValue(isAppLoadState);
  const accountType = useAtomValue(accountTypeState);

  const navBarOptions = useAtomValue(navBarOptionsState);

  const {
    isSyncing,
    isUpToDate,
    secondaryText: syncSecondaryText,
    handleManualSync: triggerManualSync,
  } = useManualSync();

  const openMore = Boolean(anchorEl);

  const handleOpenMoreMenu = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMore = () => {
    setAnchorEl(null);
  };

  const handleGoDashboard = () => {
    navigate('/');
  };

  const handleOpenMyProfile = () => {
    handleCloseMore();
    navigate(`/user-profile`);
  };

  const handleManualSync = () => {
    handleCloseMore();
    triggerManualSync();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleQuickSettings = (e) => {
    e.stopPropagation();
    navBarOptions.quickSettings();
  };

  const handleReconnectAccount = async () => {
    handleCloseMore();

    // Reconexión REAL, sin recargar a ciegas: refrescar token → revalidar
    // contra el servidor → marcar conectado y sincronizar. La recarga queda
    // solo como último recurso (p. ej. token revocado, que necesita el
    // flujo de arranque/login).
    const user = currentAuthUser();

    if (!user) {
      globalThis.location.reload();
      return;
    }

    try {
      await user.getIdToken(true);
    } catch (error) {
      console.error('Error refreshing token on reconnect:', error);
      // Sin red no hay nada que reconectar todavía — avisar en vez de
      // recargar en bucle.
      if (!navigator.onLine || (error as Error)?.message?.includes('network')) {
        displaySnackNotification({
          header: 'Sin conexión',
          message:
            'No hay internet ahora mismo. La cuenta se reconectará al volver la conexión.',
          severity: 'error',
        });
        return;
      }
      globalThis.location.reload();
      return;
    }

    try {
      const { status } = await apiValidateMe();

      if (status === 200) {
        setCongAccountConnected(true);
        displaySnackNotification({
          header: 'Cuenta reconectada',
          message: 'Sincronizando los últimos cambios…',
          severity: 'success',
        });
        await triggerManualSync();
        return;
      }
    } catch (error) {
      console.error('Error validating on reconnect:', error);
    }

    // Validación fallida (sesión caducada de verdad, etc.): el arranque
    // completo sabe gestionarlo.
    globalThis.location.reload();
  };

  const handleOpenContact = async () => {
    handleCloseMore();
    setIsContactOpen(true);
  };

  const handleOpenAbout = () => {
    handleCloseMore();
    setIsAboutOpen(true);
  };

  const handleOpenAyuda = () => {
    handleCloseMore();
    navigate('/ayuda');
  };

  const handleOpenSupport = () => {
    handleCloseMore();
    setIsSupportOpen(true);
  };

  const handleOpenDoc = () => {
    handleCloseMore();
    window.open(`https://guide.organized-app.com`, '_blank');
  };

  const handleOpenRealApp = () => {
    handleCloseMore();
    window.open(`https://organized-app.com`, '_blank');
  };

  // "Cerrar sesión" del menú: MISMO flujo que el de Mi cuenta (diálogo de
  // confirmación + logout completo). Antes hacía un sign-out ligero que
  // dejaba datos, claves y push intactos — dos botones con el mismo texto y
  // efectos distintos.
  const handleOpenLogoutConfirm = () => {
    handleCloseMore();
    setLogoutConfirmOpen(true);
  };

  const handleCloseLogoutConfirm = () => setLogoutConfirmOpen(false);

  return {
    openMore,
    handleOpenMoreMenu,
    handleCloseMore,
    anchorEl,
    handleOpenContact,
    handleOpenAbout,
    handleOpenAyuda,
    handleOpenSupport,
    handleOpenDoc,
    fullname,
    congName,
    tabletUp,
    laptopUp,
    tabletDown,
    isCongAccountConnected,
    handleOpenMyProfile,
    handleManualSync,
    isSyncing,
    isUpToDate,
    syncSecondaryText,
    handleGoDashboard,
    isAppLoad,
    handleReconnectAccount,
    handleOpenRealApp,
    accountType,
    logoutConfirmOpen,
    handleOpenLogoutConfirm,
    handleCloseLogoutConfirm,
    navBarOptions,
    handleBack,
    desktopUp,
    handleQuickSettings,
    tablet688Up,
  };
};

export default useNavbar;
