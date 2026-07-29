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
 * PENDIENTE: al entrar, la tira empieza por la primera semana de la lista (dos
 * meses atrás) y la semana actual queda fuera de la pantalla. Se probó a
 * centrarla al montar, pero MUI recoloca la tira después y borra el
 * desplazamiento; forzarlo con esperas quedaba a merced de una carrera y, en
 * cuanto se centraba también al cambiar de semana, parecía un fallo. Hace
 * falta otra solución.
 */
const WeekSelector = (props: WeekSelectorProps) => {
  const { weeksTab, handleWeekChange, currentTab } = useWeekSelector(props);

  return (
    <Box sx={{ marginTop: '-16px', marginBottom: '-32px' }}>
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
