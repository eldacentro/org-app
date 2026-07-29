import { Box } from '@mui/material';
import { WeekSelectorProps } from './index.types';
import useWeekSelector from './useWeekSelector';
import ScrollableTabs from '@components/scrollable_tabs';

/**
 * La tira de semanas de Programas semanales.
 *
 * Sin flechas a los lados: se probaron y quedaban apretadas contra la tira y
 * descuadradas con las pestañas.
 *
 * La semana actual cae casi al principio porque la lista empieza tres semanas
 * atrás (ver `weeklySchedulesFirstWeek`), no dos meses. Se probó a centrarla
 * desplazando la tira al montar y no vale: MUI la recoloca DESPUÉS y borra el
 * desplazamiento, así que dependía de ganarle una carrera con una espera; y
 * centrando también al cambiar de semana, la tira se movía sola y parecía un
 * fallo. Se resuelve con datos —qué semanas se listan— y con el difuminado de
 * los bordes, que no mueve nada.
 */
const WeekSelector = (props: WeekSelectorProps) => {
  const { weeksTab, handleWeekChange, currentTab } = useWeekSelector(props);

  return (
    <Box
      sx={{
        marginTop: '-16px',
        marginBottom: '-32px',
        // Los bordes se desvanecen para que se vea que la tira sigue a los
        // lados. Es lo que dice "hay más semanas" sin mover nada: cualquier
        // desplazamiento automático se siente como un fallo (ver abajo).
        maskImage:
          'linear-gradient(to right, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)',
      }}
    >
      <ScrollableTabs
        className="schedules-view-week-selector"
        tabs={weeksTab}
        value={currentTab}
        onChange={handleWeekChange}
      />
    </Box>
  );
};

export default WeekSelector;
