import { IconButton } from '@mui/material';
import { IconAdd } from '@icons/index';
import { PlusButtonProps } from './index.types';

/**
 * Custom button component with a plus icon.
 * @param onClick - Optional function to handle click events.
 */
const PlusButton = ({ onClick, sx }: PlusButtonProps) => {
  return (
    <IconButton
      aria-label="Sumar"
      disableRipple
      onClick={onClick}
      sx={{
        // Gemelo de `MinusButton`: sin contorno, porque la superficie la pone
        // el carril del control que los contiene.
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
      <IconAdd />
    </IconButton>
  );
};

export default PlusButton;
