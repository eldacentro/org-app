import { useState } from 'react';
import { Box } from '@mui/material';
import { IconLogo } from '@components/icons';
import { handleDeleteDatabase } from '@services/app';
import { useAppTranslation } from '@hooks/index';
import Button from '@components/button';
import Typography from '@components/typography';
import WaitingLoader from '@components/waiting_loader';

/**
 * Shown by the startup watchdog (see DatabaseWrapper) when the local database
 * never becomes ready — i.e. it failed to open and the app would otherwise
 * hang forever on the loading logo. Gives a one-tap recovery so a regular
 * user never needs to know how to clear the browser cache: handleDeleteDatabase
 * safely deletes the local (re-syncable) cache, signs out, and reloads.
 */
const DbRecoveryScreen = () => {
  const { t } = useAppTranslation();

  const [isRepairing, setIsRepairing] = useState(false);

  const handleRepair = async () => {
    if (isRepairing) return;
    setIsRepairing(true);
    await handleDeleteDatabase();
  };

  return (
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
        zIndex: 2000,
        padding: { mobile: '16px', tablet: '24px' },
        background:
          'radial-gradient(circle at 50% 50%, var(--accent-150) 0%, var(--accent-100) 100%)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '420px',
          padding: { mobile: '24px 16px', tablet: '40px 32px' },
          borderRadius: 'var(--radius-xxl)',
          border: '1px solid var(--line)',
          background: 'var(--card)',
          boxShadow: 'var(--big-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          textAlign: 'center',
        }}
      >
        <IconLogo width={72} height={72} sx={{ color: 'var(--accent-main)' }} />

        <Typography className="h2" color="var(--black)">
          {t('tr_dbRecoveryTitle', 'La aplicación no pudo abrirse')}
        </Typography>

        <Typography className="body-regular" color="var(--grey-400)">
          {t(
            'tr_dbRecoveryDesc',
            'Hubo un problema al cargar los datos guardados en este dispositivo. Pulsa el botón para repararlo. Tus datos están a salvo en el servidor y se volverán a descargar.'
          )}
        </Typography>

        <Button
          variant="main"
          onClick={handleRepair}
          disabled={isRepairing}
          sx={{ width: '100%', marginTop: '8px' }}
        >
          {isRepairing ? (
            <WaitingLoader type="circular" size={22} variant="standard" />
          ) : (
            t('tr_dbRecoveryButton', 'Reparar y volver a abrir')
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default DbRecoveryScreen;
