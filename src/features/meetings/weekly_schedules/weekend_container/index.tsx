import { Box, Stack } from '@mui/material';
import useSiblingAssignments from '../../sibling_assignments/useSiblingAssignments';
import useWeekendContainer from './useWeekendContainer';
import NoSchedule from '../no_schedule';
import SiblingAssignment from '../../sibling_assignments';
import WeekScheduleHeader from '../week_schedule_header';
import WeekChipStrip from '../week_chip_strip';
import Typography from '@components/typography';
import JwLibraryLink from '@components/jw_library_link';
import useWeekJwLibraryLink from '../useWeekJwLibraryLink';
import useUpcomingCircuitVisit from '@features/circuit_visit/shared/useUpcomingCircuitVisit';
import useMeetingHeadline from '../useMeetingHeadline';
import WeekendMeeting from '../weekend_meeting';
import { useAtomValue } from 'jotai';
import { schedulesState } from '@states/schedules';
import { useCurrentUser } from '@hooks/index';
import { isMeetingWeekPublished } from '@services/app/meetings_publish';
import { DraftBanner, DraftEmptyState } from '../draft_notice';

const WeekendContainer = ({
  onGoToVisit,
}: {
  /** Solo se pasa cuando hay visita del superintendente programada. */
  onGoToVisit?: () => void;
}) => {
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

  // El coordinador de discursos públicos edita el orador sin ser el
  // responsable de la reunión: también tiene que ver su borrador.
  const { isWeekendEditor, isPublicTalkCoordinator } = useCurrentUser();
  const canSeeDraft = isWeekendEditor || isPublicTalkCoordinator;

  const schedules = useAtomValue(schedulesState);

  const isDraft =
    !!week &&
    !isMeetingWeekPublished(
      schedules.find((record) => record.weekOf === week),
      'weekend',
      dataView ?? 'main'
    );

  const visit = useUpcomingCircuitVisit();
  const esSemanaDeVisita = !!visit && !!week && visit.weekOf === week;

  const headline = useMeetingHeadline(week, 'weekend', dataView ?? 'main');

  const jwLibraryUrl = useWeekJwLibraryLink(week, 'weekend');

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
          <WeekChipStrip
            value={value}
            onChange={handleValueChange}
            customWeeksList={weeksRange}
          />

          <WeekScheduleHeader
            currentVisible={currentWeekVisible}
            week={week}
            onCurrent={handleGoCurrent}
            lastUpdated={scheduleLastUpdated}
            title={headline.title}
            subtitle={headline.subtitle}
            action={
              jwLibraryUrl ? (
                <JwLibraryLink href={jwLibraryUrl} variant="solid" />
              ) : undefined
            }
          />

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
                marginBottom: '12px',
                borderRadius: 'var(--shape-full)',
                border: '1px solid var(--accent-200)',
                backgroundColor: 'var(--accent-100)',
                cursor: 'pointer',
                transition:
                  'background-color var(--motion-fast) var(--ease-standard)',
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

          {/* Mes en BORRADOR: ver la nota de la reunión de entre semana. */}
          {week && isDraft && !canSeeDraft && (
            <DraftEmptyState text="Todavía no hay programa publicado para esta semana." />
          )}

          {week && (!isDraft || canSeeDraft) && (
            <Stack spacing="24px">
              {isDraft && (
                <DraftBanner text="Mes sin publicar. Esto es un borrador: solo lo ves tú, y no le aparece a nadie en sus asignaciones hasta que lo publiques." />
              )}

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
