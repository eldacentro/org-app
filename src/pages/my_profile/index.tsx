import { Box } from '@mui/material';
import { PageTitle } from '@components/index';
import { IconLogout } from '@icons/index';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useMyProfile from './useMyProfile';
import AppSettings from '@features/my_profile/app_settings';
import CalendarExport from '@features/my_profile/calendar_export';
import LogoutConfirm from '@features/my_profile/logout_confirm';
import Notifications from '@features/my_profile/notifications';
import Security from '@features/my_profile/security';
import UserProfileDetails from '@features/my_profile/user_profile_details';
import UserSessions from '@features/my_profile/sessions';
import UserTimeAway from '@features/my_profile/user_time_away';
import NavBarButton from '@components/nav_bar_button';

const MyProfile = () => {
  const { t } = useAppTranslation();

  const { desktopUp, tablet688Up } = useBreakpoints();

  const {
    isLogoutConfirm,
    handleCloseConfirm,
    handleOpenLogoutConfirm,
    isConnected,
    showTimeAway,
  } = useMyProfile();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
        paddingBottom: !tablet688Up ? '60px' : '0px',
      }}
    >
      <PageTitle
        title={t('tr_myProfile')}
        buttons={
          <NavBarButton
            text={t('tr_logOut')}
            // Sin `main`: el azul relleno es para LA acción a la que uno viene
            // a la pantalla, y a tu perfil no vienes a cerrar sesión. Era el
            // botón más gritón de la página —relleno, y encima rojo— para la
            // única acción de la que uno se puede arrepentir. El rojo se
            // queda, que ese sí dice la verdad.
            color="red"
            icon={<IconLogout />}
            onClick={handleOpenLogoutConfirm}
          ></NavBarButton>
        }
      />

      {isLogoutConfirm && (
        <LogoutConfirm open={isLogoutConfirm} onClose={handleCloseConfirm} />
      )}

      {/* container */}
      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          flexWrap: desktopUp ? 'nowrap' : 'wrap',
        }}
      >
        {/* left-column */}
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
            width: '100%',
            flexGrow: 1,
          }}
        >
          <UserProfileDetails />

          {showTimeAway && <UserTimeAway />}
        </Box>

        {/* right-column */}
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            flexDirection: 'column',
            width: '100%',
            flexGrow: 1,
          }}
        >
          <AppSettings />

          <CalendarExport />

          {isConnected && <Notifications />}

          {isConnected && <Security />}

          {isConnected && <UserSessions />}
        </Box>
      </Box>
    </Box>
  );
};

export default MyProfile;
