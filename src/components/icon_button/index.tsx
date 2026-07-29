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
        transition: 'transform 100ms ease, background-color 150ms ease',

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
      {...rest}
    >
      {children}
    </MUIIconButton>
  );
};

export default IconButton;
