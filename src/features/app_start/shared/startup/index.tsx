import { Box } from '@mui/material';
import { IconLogo } from '@components/icons';
import Typography from '@components/typography';
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
        {isAuth && <WaitingLoader type="lottie" />}
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
                  minHeight: '75vh',
                  width: '100%',
                  padding: { mobile: '16px', tablet: '24px' },
                  background: 'radial-gradient(circle at 50% 50%, var(--accent-150) 0%, var(--accent-100) 100%)',
                  borderRadius: 'var(--radius-xxl)',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: { mobile: '24px 16px', tablet: '40px 32px' },
                    borderRadius: 'var(--radius-xxl)',
                    border: '1px solid var(--accent-300)',
                    background: 'var(--white)',
                    boxShadow: 'var(--big-card-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                  }}
                >
                  {/* Branded Logo Header */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <IconLogo width={80} height={80} sx={{ color: 'var(--accent-main)' }} />
                    <Typography className="h2" color="var(--accent-main)" sx={{ fontWeight: 800, letterSpacing: '0.5px' }}>
                      Elda Centro
                    </Typography>
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

  return <WaitingLoader type="lottie" />;
};

export default Startup;
