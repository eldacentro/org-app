import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import {
  displaySnackNotification,
  setIsAboutOpen,
  setIsContactOpen,
  setIsSupportOpen,
} from '@services/states/app';
import {
  useBreakpoints,
  useManualSync,
  useReconexionCuenta,
} from '@hooks/index';
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
import { TEXTO_RESULTADO } from '@features/cuenta_desconectada/textos';

const useNavbar = () => {
  const navigate = useNavigate();

  const {
    laptopUp,
    tabletDown,
    tabletUp,
    desktopUp,
    tablet600Up,
    carrilLateral,
  } = useBreakpoints();

  const [anchorEl, setAnchorEl] = useAtom(navBarAnchorElState);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const fullname = useAtomValue(fullnameState);
  const congName = useAtomValue(congNameState);
  const isCongAccountConnected = useAtomValue(congAccountConnectedState);
  const isAppLoad = useAtomValue(isAppLoadState);
  const accountType = useAtomValue(accountTypeState);
  const { reconectar, intentando: reconectando } = useReconexionCuenta();

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

  // La lógica vive en `useReconexionCuenta`, compartida con el aviso de
  // cuenta desconectada. Antes este botón RECARGABA la app sin decir nada en
  // cuanto algo no salía (el servidor no contestaba, la sesión ya no valía…),
  // volvía a la misma pantalla igual de desconectada, y para quien lo pulsaba
  // simplemente «no hacía nada». Ahora siempre dice cómo ha ido.
  const handleReconnectAccount = async () => {
    handleCloseMore();

    const resultado = await reconectar();

    // `atascada` recarga la app: lo cuenta ella misma al volver.
    if (resultado === 'atascada') return;

    const { titulo, texto } = TEXTO_RESULTADO[resultado];

    displaySnackNotification({
      header: titulo,
      message: texto,
      severity: resultado === 'conectada' ? 'success' : 'error',
    });
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
    reconectando,
    handleOpenRealApp,
    accountType,
    logoutConfirmOpen,
    handleOpenLogoutConfirm,
    handleCloseLogoutConfirm,
    navBarOptions,
    handleBack,
    desktopUp,
    handleQuickSettings,
    tablet600Up,
    carrilLateral,
  };
};

export default useNavbar;
