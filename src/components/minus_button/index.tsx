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
      disableRipple
      onClick={onClick}
      sx={{
        border: '1px solid var(--accent-350)',
        // Redondo del todo, como el `IconButton` compartido de la app.
        // Estaban a 12px y eran los dos ÚNICOS botones de icono cuadraditos
        // de toda la aplicación: en el editor de horas del Informe se veía el
        // contraste, porque al lado no hay ninguna otra caja de ese radio.
        borderRadius: 'var(--shape-full)',
        '&:hover': {
          '@media (hover: hover)': {
            backgroundColor: 'var(--accent-200)',
            border: '1px solid var(--accent-dark)',
            '& svg, & svg g, & svg g path': {
              fill: 'var(--accent-dark)',
            },
          },
        },

        '&:focus-visible': {
          outline: 'var(--accent-main) auto 1px',
        },

        '&:active': {
          backgroundColor: 'var(--accent-150)',
          border: '1px solid var(--accent-dark)',
          '& svg, & svg g, & svg g path': {
            fill: 'var(--accent-dark)',
          },
        },
        '& svg, & svg g, & svg g path': {
          fill: 'var(--accent-350)',
        },
        ...sx,
      }}
    >
      <IconRemove />
    </IconButton>
  );
};

export default MinusButton;
