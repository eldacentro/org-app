import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { IconNavigateLeft, IconNavigateRight } from '@components/icons';
import { WeekSelectorProps } from './index.types';
import useWeekSelector from './useWeekSelector';
import ScrollableTabs from '@components/scrollable_tabs';

/**
 * Botón de semana anterior / siguiente.
 *
 * Se apaga en los extremos en vez de desaparecer, igual que en el navegador de
 * los editores: si se ocultara, la tira de semanas cambiaría de ancho al
 * llegar al principio o al final.
 */
const Flecha = ({
  activa,
  onClick,
  label,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) => (
  <Box
    role="button"
    aria-label={label}
    aria-disabled={!activa}
    onClick={activa ? onClick : undefined}
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      flexShrink: 0,
      borderRadius: 'var(--radius-max)',
      cursor: activa ? 'pointer' : 'default',
      '&:hover': { backgroundColor: activa ? 'var(--accent-150)' : 'unset' },
    }}
  >
    {children}
  </Box>
);

/**
 * La tira de semanas de Programas semanales.
 *
 * Lleva flechas a los lados porque en un móvil no había ninguna: las de MUI
 * solo salen en escritorio, así que la única forma de cambiar de semana era
 * deslizar, y nada lo insinuaba. Cambian de semana, no desplazan la tira — es
 * lo mismo que hacen las flechas de los editores.
 */
const WeekSelector = (props: WeekSelectorProps) => {
  const { weeksTab, handleWeekChange, currentTab } = useWeekSelector(props);

  const index = typeof currentTab === 'number' ? currentTab : -1;

  const canBack = index > 0;
  const canNext = index !== -1 && index < weeksTab.length - 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '-16px',
        marginBottom: '-32px',
      }}
    >
      <Flecha
        activa={canBack}
        label="Semana anterior"
        onClick={() => handleWeekChange(index - 1)}
      >
        <IconNavigateLeft
          width={20}
          height={20}
          color={canBack ? 'var(--accent-main)' : 'var(--grey-300)'}
        />
      </Flecha>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ScrollableTabs
          className="schedules-view-week-selector"
          tabs={weeksTab}
          value={currentTab}
          onChange={handleWeekChange}
          centerSelected
        />
      </Box>

      <Flecha
        activa={canNext}
        label="Semana siguiente"
        onClick={() => handleWeekChange(index + 1)}
      >
        <IconNavigateRight
          width={20}
          height={20}
          color={canNext ? 'var(--accent-main)' : 'var(--grey-300)'}
        />
      </Flecha>
    </Box>
  );
};

export default WeekSelector;
