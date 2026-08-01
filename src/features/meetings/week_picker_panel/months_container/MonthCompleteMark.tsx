import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { IconCheck } from '@components/icons';
import { schedulesWeekAssignmentsInfo } from '@services/app/schedules';
import { schedulesState } from '@states/schedules';

/**
 * La marca de "este mes ya está repartido entero", a la derecha del nombre del
 * mes.
 *
 * Va en su propio componente y no en el contenedor porque el recuento necesita
 * leer los programas de cada mes, y eso es un hook: dentro de un `map` del
 * padre no se puede llamar. Así cada mes cuenta lo suyo y el contenedor se
 * queda siendo una lista.
 */
const MonthCompleteMark = ({ weeks }: { weeks: string[] }) => {
  const location = useLocation();
  const schedules = useAtomValue(schedulesState);

  const meeting = useMemo(
    () => (location.pathname === '/midweek-meeting' ? 'midweek' : 'weekend'),
    [location.pathname]
  );

  const completo = useMemo(() => {
    let total = 0;
    let assigned = 0;

    for (const week of weeks) {
      const schedule = schedules.find((record) => record.weekOf === week);
      if (!schedule) continue;

      const data = schedulesWeekAssignmentsInfo(schedule.weekOf, meeting);
      total += data.total;
      assigned += data.assigned;
    }

    return total > 0 && assigned === total;
  }, [weeks, schedules, meeting]);

  if (!completo) return null;

  return (
    <Box
      sx={{
        borderRadius: 'var(--shape-full)',
        width: '18.4px',
        height: '18.4px',
        padding: '2px',
        backgroundColor: 'var(--accent-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconCheck color="var(--card)" height={14.4} width={14.4} />
    </Box>
  );
};

export default MonthCompleteMark;
