import { Box, Stack } from '@mui/material';
import { IconAccount, IconCheck } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import useRequestAccess from './useRequestAccess';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';
import TextField from '@components/textfield';
import Typography from '@components/typography';

const RequestAccess = () => {
  const { t } = useAppTranslation();

  const {
    firstname,
    lastname,
    setFirstname,
    setLastname,
    handleRequestAccess,
    isProcessing,
    requestSent,
    loadError,
    setLoadError,
    submitError,
    country,
    setCountry,
    congregation,
    setCongregation,
  } = useRequestAccess();

  if (requestSent) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
          padding: '24px',
          borderRadius: 'var(--r-lg)',
          background: 'var(--accent-100)',
          border: '1px solid var(--line)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent-main)',
            color: 'var(--always-white)',
            marginBottom: '8px',
          }}
        >
          <IconCheck width={32} height={32} sx={{ color: 'var(--always-white)' }} />
        </Box>
        <Typography
          className="h2"
          sx={{ fontWeight: 700, color: 'var(--black)' }}
        >
          ¡Solicitud enviada con éxito!
        </Typography>
        <Typography className="body-regular" sx={{ color: 'var(--grey-400)', maxWidth: '360px' }}>
          La solicitud de acceso ha sido enviada. El administrador de la congregación Elda - Centro la revisará. Por favor, actualiza la página una vez te hayan concedido los permisos.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing="24px" sx={{ containerType: 'inline-size' }}>
      {loadError && (
        <Box
          sx={{
            padding: '16px',
            borderRadius: 'var(--radius-l)',
            background: 'var(--red-100)',
            border: '1px solid var(--red-300)',
          }}
        >
          <Typography className="body-regular" sx={{ color: 'var(--red-900)', fontWeight: 600 }}>
            Error al conectar con Elda Centro:
          </Typography>
          <Typography className="body-small-regular" sx={{ color: 'var(--red-800)', marginTop: '4px' }}>
            {loadError}
          </Typography>
        </Box>
      )}

      {submitError && (
        <Box
          sx={{
            padding: '16px',
            borderRadius: 'var(--radius-l)',
            background: 'var(--red-100)',
            border: '1px solid var(--red-300)',
          }}
        >
          <Typography className="body-regular" sx={{ color: 'var(--red-900)', fontWeight: 600 }}>
            Error al enviar la solicitud:
          </Typography>
          <Typography className="body-small-regular" sx={{ color: 'var(--red-800)', marginTop: '4px' }}>
            {submitError}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexDirection: { '@': 'column', '@400': 'row' },
        }}
      >
        <TextField
          label={t('tr_firstname')}
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
          startIcon={<IconAccount color="var(--black)" />}
        />
        <TextField
          label={t('tr_lastname')}
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
        />
      </Box>

      {!country || !congregation ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
          }}
        >
          <IconLoading width={24} height={24} color="var(--accent-main)" />
          <Typography className="body-regular" sx={{ color: 'var(--grey-350)' }}>
            Conectando con Elda Centro...
          </Typography>
        </Box>
      ) : (
        <Button
          disabled={isProcessing}
          onClick={handleRequestAccess}
          startIcon={
            isProcessing && (
              <IconLoading width={22} height={22} color="var(--always-white)" />
            )
          }
        >
          {t('tr_requestAccess')}
        </Button>
      )}
    </Stack>
  );
};

export default RequestAccess;
