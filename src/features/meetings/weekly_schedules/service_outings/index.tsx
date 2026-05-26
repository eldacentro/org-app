import { Box, Stack } from '@mui/material';
import useServiceOutingsContainer from './useServiceOutingsContainer';
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

  return (
    <>
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
