import { Box, Stack } from '@mui/material';
import useMidweekContainer from './useMidweekContainer';
import useSiblingAssignments from '../../sibling_assignments/useSiblingAssignments';
import MidweekMeeting from '../midweek_meeting';
import NoSchedule from '../no_schedule';
import SiblingAssignment from '../../sibling_assignments';
import WeekScheduleHeader from '../week_schedule_header';
import WeekSelector from '../week_selector';
import Typography from '@components/typography';
import JwLibraryLink from '@components/jw_library_link';
import useWeekJwLibraryLink from '../useWeekJwLibraryLink';
import useUpcomingCircuitVisit from '@features/circuit_visit/shared/useUpcomingCircuitVisit';

const MidweekContainer = ({
  onGoToVisit,
}: {
  /** Solo se pasa cuando hay visita del superintendente programada. */
  onGoToVisit?: () => void;
}) => {
  const { views } = useSiblingAssignments();

  const {
    handleGoCurrent,
    handleValueChange,
    value,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    dataView,
  } = useMidweekContainer();

  const visit = useUpcomingCircuitVisit();
  const esSemanaDeVisita = !!visit && !!week && visit.weekOf === week;

  const jwLibraryUrl = useWeekJwLibraryLink(week, 'midweek');

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

          {/* Uno por reunión, en la cabecera. Uno por parte sería ruido. */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            {jwLibraryUrl && <JwLibraryLink href={jwLibraryUrl} />}

            {/* Solo en la semana de la visita, y solo si hay a dónde ir. */}
            {esSemanaDeVisita && onGoToVisit && (
              <Box
                component="button"
                type="button"
                onClick={onGoToVisit}
                sx={{
                  appearance: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: '10px',
                  py: '4px',
                  borderRadius: 'var(--radius-max)',
                  border: '1px solid var(--accent-200)',
                  backgroundColor: 'var(--accent-100)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  '&:hover': { backgroundColor: 'var(--accent-200)' },
                }}
              >
                <Typography
                  className="label-small-semibold"
                  color="var(--accent-main)"
                >
                  Ver visita del superintendente →
                </Typography>
              </Box>
            )}
          </Box>

          {week && (
            <Stack spacing="24px">
              <MidweekMeeting week={week} dataView={dataView} />

              {views.map((view) => (
                <SiblingAssignment
                  key={view.type}
                  label={view.label}
                  type={view.type}
                >
                  <MidweekMeeting week={week} dataView={view.type} />
                </SiblingAssignment>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </>
  );
};

export default MidweekContainer;
