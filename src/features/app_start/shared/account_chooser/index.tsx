import { Box, Button, Fade } from '@mui/material';
import { useAtomValue } from 'jotai';
import { reentrarCuentaState } from '@states/app';
import AppButton from '@components/button';
import IconLoading from '@components/icon_loading';
import { IconError, IconGoogle } from '@icons/index';
import useAccountChooser from './useAccountChooser';
import InfoMessage from '@components/info-message';
import Typography from '@components/typography';

const AccountChooser = () => {
  const {
    handleChooseGoogle,
    isAuthProcessing,
    isVisible,
    title,
    message,
    variant,
    hideMessage,
  } = useAccountChooser();

  // Se llega aquí desde «Volver a entrar», con la app ya instalada y sus
  // datos en el dispositivo: el saludo de bienvenida no pega, y hay que dejar
  // claro que no se ha perdido nada — y una salida si ahora no puede.
  const reentrar = useAtomValue(reentrarCuentaState);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        textAlign: 'center',
        gap: '24px',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography
          className="h1"
          color="var(--black)"
          // Ídem: `h1` ya trae el tamaño. El 28 se salía de la escala por
          // cuatro píxeles y tampoco se aplicaba.
          sx={{ fontWeight: 800, lineHeight: 1.2 }}
        >
          {reentrar ? 'Vuelve a entrar' : 'Bienvenido a Elda Centro'}
        </Typography>
        <Typography
          className="body-regular"
          sx={{
            fontSize: '15px',
            color: 'var(--grey-350)',
            margin: '0 auto',
            maxWidth: '380px',
          }}
        >
          {reentrar
            ? 'La sesión de este dispositivo se había cerrado. Entra con la misma cuenta de Google de siempre: no se ha borrado nada y lo encontrarás todo igual.'
            : 'Inicia sesión con tu cuenta para acceder a los programas, asignaciones y predicación.'}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '8px',
        }}
      >
        <Button
          variant="outlined"
          onClick={handleChooseGoogle}
          disabled={isAuthProcessing}
          startIcon={
            isAuthProcessing ? (
              <IconLoading width={20} color="var(--black)" />
            ) : (
              <IconGoogle width={24} height={24} />
            )
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 24px',
            borderRadius: 'var(--shape-full)',
            border: '1px solid var(--line)',
            background: 'var(--card)',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '16px',
            color: 'var(--black)',
            boxShadow: 'var(--btn-shadow)',
            transition:
              'border-color var(--motion-fast) var(--ease-standard), background-color var(--motion-fast) var(--ease-standard), transform var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
            '&.Mui-disabled': {
              opacity: 0.7,
              border: '1px solid var(--line)',
            },
            '&:hover': {
              border: '1px solid var(--accent-main)',
              background: 'var(--accent-100)',
              transform: 'translateY(-1px)',
              boxShadow: 'var(--hover-shadow)',
            },
          }}
        >
          {isAuthProcessing ? 'Conectando…' : 'Continuar con Google'}
        </Button>
      </Box>

      {reentrar ? (
        // Recargar devuelve a la app con lo que hay en el dispositivo: la
        // marca de «volver a entrar» vive solo en memoria y se olvida.
        <AppButton
          variant="tertiary"
          onClick={() => window.location.reload()}
          disabled={isAuthProcessing}
        >
          Ahora no, volver a la aplicación
        </AppButton>
      ) : (
        <Typography
          className="body-small-regular"
          sx={{ fontSize: '12px', marginTop: '8px', color: 'var(--grey-300)' }}
        >
          ¿No tienes acceso? Habla con un anciano
        </Typography>
      )}

      <Fade in={isVisible} unmountOnExit timeout={150}>
        <Box>
          <InfoMessage
            variant={variant}
            messageIcon={<IconError />}
            messageHeader={title}
            message={message}
            onClose={hideMessage}
          />
        </Box>
      </Fade>
    </Box>
  );
};

export default AccountChooser;
