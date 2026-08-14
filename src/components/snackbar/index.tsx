import { forwardRef } from 'react';
import {
  Slide,
  SlideProps,
  Snackbar as MUISnackbar,
  SnackbarCloseReason,
  SnackbarOrigin,
} from '@mui/material';
import { SnackbarPropsType } from './index.types';
import InfoMessage from '@components/info-message';
import useBreakpoints from '@hooks/useBreakpoints';

/**
 * El aviso entra DESDE EL BORDE en el que aparece: si sale abajo, sube; si
 * sale arriba, baja.
 *
 * Antes era un `Fade`, el mismo para las dos posiciones, así que el aviso se
 * materializaba en el sitio sin decir de dónde venía. La regla es de Material
 * —«the direction a component enters is informed by their location on screen,
 * expanding away from the device edge»— y no es adorno: un aviso que sube
 * desde abajo se entiende como algo que ha llegado, y deja claro hacia dónde
 * se va cuando se cierre.
 *
 * `Slide` mueve solo `transform`, que es lo más barato que hay.
 */
const SlideTransition = forwardRef<
  HTMLDivElement,
  SlideProps & { direccion: 'up' | 'down' }
>(({ direccion, ...props }, ref) => (
  <Slide
    {...props}
    ref={ref}
    direction={direccion}
    // Entra frenando y sale acelerando, como el diálogo. Si no se le dicen,
    // `Slide` usa las curvas de MUI y el aviso se movería con otro acento que
    // el resto de la app.
    easing={{
      enter: 'var(--ease-emphasized)',
      exit: 'var(--ease-emphasized-out)',
    }}
  />
));
SlideTransition.displayName = 'SlideTransition';

/**
 * Custom Snackbar component.
 */
const Snackbar = (props: SnackbarPropsType) => {
  const { tablet688Up } = useBreakpoints();

  const open = props.open || false;
  const messageHeader = props.messageHeader || '';
  const message = props.message || '';
  const variant = props.variant || 'message-with-button';
  const position = props.position || 'bottom-center';

  /**
   * Gets the anchor origin for the Snackbar based on the specified position.
   * @returns SnackbarOrigin - The anchor origin for the Snackbar.
   */
  const getAnchorOrigin = () => {
    const anchor = {} as SnackbarOrigin;

    if (position === 'top-center') {
      anchor.vertical = 'top';
      anchor.horizontal = 'center';
    }

    if (position === 'bottom-center') {
      anchor.vertical = 'bottom';
      anchor.horizontal = 'center';
    }

    return anchor;
  };

  /**
   * Handles the Snackbar close event.
   * @param _ - The event.
   * @param reason - The reason for closing the Snackbar.
   */
  const handleClose = (_, reason: SnackbarCloseReason) => {
    if (reason === 'clickaway') {
      return;
    }

    props.onClose();
  };

  return (
    <MUISnackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={getAnchorOrigin()}
      autoHideDuration={variant === 'message-with-button' ? null : 5000}
      slots={{ transition: SlideTransition }}
      slotProps={{
        transition: {
          direccion: position === 'top-center' ? 'down' : 'up',
        } as never,
        content: {
          style: {
            boxShadow: 'none',
            backgroundColor: 'transparent',
          },
        },
      }}
      sx={{
        padding: 0,
        top: position === 'top-center' ? '80px' : 'unset',
        bottom:
          position === 'bottom-center'
            ? tablet688Up
              ? '24px'
              : 'calc(80px + env(safe-area-inset-bottom, 0px))'
            : 'unset',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        '.MuiSnackbarContent-message': {
          display: 'flex',
          justifyContent: 'center',
          padding: 0,
          '& > div:first-of-type': {
            border: '1px solid var(--accent-300)',
          },
        },
        '.MuiSnackbarContent-root': {
          padding: 0,
        },
      }}
      message={
        <InfoMessage
          messageIcon={props.messageIcon}
          messageHeader={messageHeader}
          message={message}
          variant={variant}
          actionText={props.actionText}
          actionClick={props.actionClick}
          actionIcon={props.actionIcon}
          onClose={props.onClose}
        />
      }
    />
  );
};

export default Snackbar;
