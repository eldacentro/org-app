import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { IconInfo } from '@components/icons';
import useServiceOutingsContainer from './useServiceOutingsContainer';
import ConsejosDialog from './ConsejosDialog';
import Accion from '../week_schedule_header/Accion';
import NoSchedule from '../no_schedule';
import WeekScheduleHeader from '../week_schedule_header';
import WeekSelector from '../week_selector';
import ServiceOutingsMeeting from './ServiceOutingsMeeting';

const ServiceOutingsContainer = () => {
  const {
    handleGoCurrent,
    handleValueChange,
    value,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    weekRecord,
  } = useServiceOutingsContainer();

  const [consejos, setConsejos] = useState(false);

  return (
    <>
      <ConsejosDialog open={consejos} onClose={() => setConsejos(false)} />

      {noSchedule && <NoSchedule />}

      {!noSchedule && (
        <Box
          sx={{
            marginTop: '8px',
          }}
        >
          <WeekSelector value={value} onChange={handleValueChange} />

          <WeekScheduleHeader
            currentVisible={currentWeekVisible}
            week={week}
            onCurrent={handleGoCurrent}
            lastUpdated={scheduleLastUpdated}
            action={
              <Accion
                icono={
                  <IconInfo
                    color="var(--always-white)"
                    width={16}
                    height={16}
                  />
                }
                texto="Consejos"
                onClick={() => setConsejos(true)}
              />
            }
          />

          {week && (
            <Stack spacing="24px">
              <ServiceOutingsMeeting week={week} weekRecord={weekRecord} />
            </Stack>
          )}
        </Box>
      )}
    </>
  );
};

export default ServiceOutingsContainer;
