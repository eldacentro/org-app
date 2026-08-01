import { Box, Stack } from '@mui/material';
import useDepartmentsContainer from './useDepartmentsContainer';
import NoSchedule from '../no_schedule';
import WeekScheduleHeader from '../week_schedule_header';
import WeekChipStrip from '../week_chip_strip';
import DepartmentsMeeting from './DepartmentsMeeting';

const DepartmentsContainer = () => {
  const {
    handleGoCurrent,
    handleValueChange,
    value,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    schedule,
  } = useDepartmentsContainer();

  return (
    <>
      {noSchedule && <NoSchedule />}

      {!noSchedule && (
        <Box
          sx={{
            marginTop: '8px',
            // El bloque de cabecera con un sistema claro: 16px entre piezas
            // (tira de semanas, cabecera, contenido) y 8px dentro de cada una.
            // Antes no había ninguno: la tira traía márgenes NEGATIVOS para
            // compensar el alto de las pestañas de MUI y acababa pegada al
            // titular de la semana.
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <WeekChipStrip value={value} onChange={handleValueChange} />

          <WeekScheduleHeader
            currentVisible={currentWeekVisible}
            week={week}
            onCurrent={handleGoCurrent}
            lastUpdated={scheduleLastUpdated}
          />

          {week && (
            <Stack spacing="24px">
              <DepartmentsMeeting schedule={schedule} />
            </Stack>
          )}
        </Box>
      )}
    </>
  );
};

export default DepartmentsContainer;
