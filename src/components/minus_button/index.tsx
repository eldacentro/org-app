import { IconButton } from '@mui/material';
import { IconRemove } from '@icons/index';
import { MinusButtonProps } from './index.types';

/**
 * Custom minus button component.
 * @param onClick - Callback function for the click event.
 * @returns JSX element for the CustomMinusButton component.
 */
const MinusButton = ({ onClick, sx }: MinusButtonProps) => {
  return (
    <IconButton
      aria-label="Restar"
      disableRipple
      onClick={onClick}
      sx={{
        // SIN contorno propio. Antes era un círculo dibujado y, pegado al
        // rectángulo del número, parecían tres piezas de tres juegos distintos.
        // Ahora el − y el + van DENTRO del carril del control (ver
        // `hours_editor`): la superficie la pone el carril, así que un borde
        // aquí sobra. Lo redondo se queda solo en lo que se ve al tocar.
        width: '40px',
        height: '40px',
        flex: '0 0 auto',
        borderRadius: 'var(--shape-full)',
        backgroundColor: 'transparent',
        '&:hover': {
          '@media (hover: hover)': {
            backgroundColor: 'var(--state-hover)',
            '& svg, & svg g, & svg g path': { fill: 'var(--accent-dark)' },
          },
        },
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '-2px',
        },
        '&:active': {
          backgroundColor: 'var(--state-pressed)',
          '& svg, & svg g, & svg g path': { fill: 'var(--accent-dark)' },
        },
        '& svg, & svg g, & svg g path': {
          fill: 'var(--accent-400)',
        },
        ...sx,
      }}
    >
      <IconRemove />
    </IconButton>
  );
};

export default MinusButton;
