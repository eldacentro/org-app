import { Box } from '@mui/material';
import { WeekItemType } from './index.types';
import useWeekItem from './useWeekItem';
import Typography from '@components/typography';
import ProgressBarSmall from '@components/progress_bar_small';

const WeekItem = ({ week }: WeekItemType) => {
  const { weekDateLocale, handleSelectWeek, isSelected, assigned, total } =
    useWeekItem(week);

  // Botón de verdad, como su gemela del otro selector. Elegir semana es LA
  // acción de este panel y era un `Box` con `onClick`: solo con el ratón. No
  // lo cazó el barrido de teclado porque estas filas viven dentro de un
  // `Collapse` y solo existen con el mes desplegado — lo que no está pintado
  // no se puede medir. `aria-current` dice cuál está elegida sin depender del
  // color.
  return (
    <Box
      component="button"
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      sx={{
        width: '100%',
        appearance: 'none',
        border: 'none',
        font: 'inherit',
        textAlign: 'left',
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '-2px',
        },
        cursor: 'pointer',
        padding: '8px 8px 8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--line)',
        backgroundColor: isSelected ? 'var(--accent-150)' : 'unset',
        '.MuiTypography-root': {
          color: isSelected ? 'var(--accent-dark)' : 'var(--black)',
        },
        '&:hover': {
          backgroundColor: 'var(--accent-150)',
          '.MuiTypography-root': {
            color: 'var(--accent-dark)',
          },
        },
      }}
      onClick={() => handleSelectWeek(week)}
    >
      <Typography>{weekDateLocale}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '144px' }}>
        <ProgressBarSmall value={assigned} maxValue={total} />
        <Typography
          className="label-small-medium"
          sx={{ width: '48px' }}
          textAlign="right"
        >
          {total > 0 && `${assigned}/${total}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default WeekItem;
