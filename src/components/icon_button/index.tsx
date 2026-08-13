import { FC } from 'react';
import { IconButtonProps, IconButton as MUIIconButton } from '@mui/material';

interface CustomIconButtonProps extends IconButtonProps {
  disableHover?: boolean;
}

/**
 * Component representing a custom icon button.
 *
 * @param {CustomIconButtonProps} props - Props for the CustomIconButton component.
 * @returns {JSX.Element} CustomIconButton component.
 */
const IconButton: FC<CustomIconButtonProps> = (props) => {
  const { children, disableHover, ...rest } = props;

  const getBackgroundColor = () => {
    switch (props.color) {
      case 'error':
        return 'var(--red-secondary)';

      default:
        return 'var(--accent-200)';
    }
  };

  return (
    <MUIIconButton
      color="inherit"
      // SIN `edge`. Lo llevaba puesto a fuego (`edge="start"`), y eso en MUI
      // es un `margin-left: -12px` pensado para el botón que va pegado al
      // borde izquierdo de una barra. Como esto lo usa TODA la app, cualquier
      // botón de icono que no estuviera en ese sitio salía 12px corrido a la
      // izquierda — encima del borde del campo que tenía al lado, o comiéndose
      // el hueco del elemento anterior. Quien de verdad esté al borde de una
      // barra puede pedir `edge="start"` a mano.
      disableRipple
      sx={{
        padding: '8px',
        borderRadius: 'var(--shape-full)',
        transition:
          'transform var(--motion-fast) var(--ease-standard), background-color var(--motion-fast) var(--ease-standard)',

        ...(disableHover
          ? {
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }
          : {
              '&:hover': {
                backgroundColor: getBackgroundColor(),
              },
              '&:active': {
                backgroundColor: getBackgroundColor(),
                transform: 'scale(0.92)',
              },
            }),

        '@media (hover: none)': {
          '&:hover': {
            backgroundColor: 'transparent',
          },
        },

        '&:focus-visible': {
          outline: 'var(--accent-main) auto 1px',
        },

        ...props.sx,
      }}
      // OJO, y está sin arreglar a propósito: `rest` TODAVÍA contiene `sx`,
      // así que este spread vuelve a poner el `sx` de quien llama y se lleva
      // por delante todo el de arriba —relleno, radio, transición, hover,
      // pulsado y foco—. Le pasa a los 28 ficheros que le pasan un `sx`, que
      // son casi todos los botones de icono de la app.
      //
      // No se toca aquí porque arreglarlo devuelve de golpe el hover y el
      // `scale(0.92)` a 28 sitios que hoy no los tienen, y eso hay que verlo
      // pantalla por pantalla. Es una pasada aparte, no un efecto colateral
      // de otra cosa.
      //
      // Por eso el área táctil de 48 NO va aquí sino en `global/index.css`,
      // sobre `.MuiIconButton-root`: allí ningún `sx` la puede borrar, y de
      // paso alcanza también a los que usan el `IconButton` de MUI en crudo.
      {...rest}
    >
      {children}
    </MUIIconButton>
  );
};

export default IconButton;
