import { Box } from '@mui/material';
import { IconLogo } from '@components/icons';
import AccountChooser from '@features/app_start/shared/account_chooser';
import PocketStartup from '@features/app_start/pocket/startup';
import VipStartup from '@features/app_start/vip/startup';
import UnauthorizedRole from '../unauthorized_role';
import useStartup from './useStartup';
import WaitingLoader from '@components/waiting_loader';

const Startup = () => {
  const { isSetup, isAuth, isAccountChoose, accountType, isUnauthorizedRole } =
    useStartup();

  if (isSetup) {
    return (
      <>
        {isAuth && (
          <WaitingLoader type="lottie" message="Comprobando tu sesión" />
        )}
        {!isAuth && (
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexWrap: 'wrap',
              flexDirection: 'column',
              gap: { mobile: '16px', laptop: '24px' },
              marginBottom: '32px',
              overflow: 'auto',
            }}
          >
            {!isUnauthorizedRole && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  minHeight: '100dvh',
                  width: '100vw',
                  zIndex: 1300,
                  padding: { mobile: '16px', tablet: '24px' },
                  // Ocupa la pantalla entera: el relleno tiene que contar
                  // con la muesca y con la barra del gesto de inicio.
                  paddingTop: 'max(16px, env(safe-area-inset-top))',
                  paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                  background:
                    'radial-gradient(circle at 50% 50%, var(--accent-150) 0%, var(--accent-100) 100%)',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: { mobile: '24px 16px', tablet: '40px 32px' },
                    borderRadius: 'var(--shape-lg)',
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    boxShadow: 'var(--big-card-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                  }}
                >
                  {/* El logotipo de la tarjeta. Lo que va debajo mientras se
                      comprueba la sesión es una ruedecita neutra, NO la marca
                      otra vez: dos veces el mismo icono, uno encima de otro,
                      es lo que parecía un fallo al abrir la app. */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <IconLogo
                      width={80}
                      height={80}
                      sx={{ color: 'var(--accent-main)' }}
                    />
                  </Box>

                  {isAccountChoose && <AccountChooser />}
                  {!isAccountChoose && (
                    <>
                      {accountType === 'vip' && <VipStartup />}
                      {accountType === 'pocket' && <PocketStartup />}
                    </>
                  )}
                </Box>
              </Box>
            )}
            {isUnauthorizedRole && <UnauthorizedRole />}
          </Box>
        )}
      </>
    );
  }

  return <WaitingLoader type="lottie" message="Preparando tus datos" />;
};

export default Startup;
