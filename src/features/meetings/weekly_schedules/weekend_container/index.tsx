import { Box, Stack } from '@mui/material';
import useSiblingAssignments from '../../sibling_assignments/useSiblingAssignments';
import useWeekendContainer from './useWeekendContainer';
import NoSchedule from '../no_schedule';
import SiblingAssignment from '../../sibling_assignments';
import WeekScheduleHeader from '../week_schedule_header';
import WeekSelector from '../week_selector';
import JwLibraryLink from '@components/jw_library_link';
import useWeekJwLibraryLink from '../useWeekJwLibraryLink';
import WeekendMeeting from '../weekend_meeting';

const WeekendContainer = () => {
  const { views } = useSiblingAssignments();

  const {
    currentWeekVisible,
    handleGoCurrent,
    handleValueChange,
    value,
    week,
    weeksRange,
    scheduleLastUpdated,
    noSchedule,
    dataView,
  } = useWeekendContainer();

  const jwLibraryUrl = useWeekJwLibraryLink(week, 'weekend');

  return (
    <>
      {noSchedule && <NoSchedule />}

      {!noSchedule && (
        <Box
          sx={{
            marginTop: '8px',
          }}
        >
          <WeekSelector
            value={value}
            onChange={handleValueChange}
            customWeeksList={weeksRange}
          />

          <WeekScheduleHeader
            currentVisible={currentWeekVisible}
            week={week}
            onCurrent={handleGoCurrent}
            lastUpdated={scheduleLastUpdated}
          />

          {/* Uno por reunión, en la cabecera. Uno por parte sería ruido. */}
          {jwLibraryUrl && (
            <JwLibraryLink
              href={jwLibraryUrl}
              sx={{ marginBottom: '12px' }}
            />
          )}

          {week && (
            <Stack spacing="24px">
              <WeekendMeeting week={week} dataView={dataView} />

              {views.map((view) => (
                <SiblingAssignment
                  key={view.type}
                  label={view.label}
                  type={view.type}
                >
                  <WeekendMeeting week={week} dataView={view.type} />
                </SiblingAssignment>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </>
  );
};

export default WeekendContainer;
