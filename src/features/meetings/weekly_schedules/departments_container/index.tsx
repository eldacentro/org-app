import { Box, Stack } from '@mui/material';
import useDepartmentsContainer from './useDepartmentsContainer';
import NoSchedule from '../no_schedule';
import WeekScheduleHeader from '../week_schedule_header';
import WeekSelector from '../week_selector';
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
              <DepartmentsMeeting schedule={schedule} />
            </Stack>
          )}
        </Box>
      )}
    </>
  );
};

export default DepartmentsContainer;
