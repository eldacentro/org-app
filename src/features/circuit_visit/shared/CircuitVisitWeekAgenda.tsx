import { Fragment, ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import Divider from '@components/divider';
import {
  IconMinistry,
  IconGroupMeetingsSchedules,
  IconPioneerForm,
  IconOverseer,
} from '@components/icons';
import AddToCalendar from '@features/activities/upcoming_events/add_to_calendar';
import { UpcomingEventType } from '@definition/upcoming_events';
import { circuitVisitsState } from '@states/circuit_visit';
import { upcomingEventsState } from '@states/upcoming_events';
import {
  serviceOutingsListState,
  serviceOutingsSettingsState,
} from '@states/service_outings';
import {
  midweekMeetingTimeState,
  weekendMeetingTimeState,
} from '@states/settings';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { isSpecialMeetingComplete } from '@services/app/circuit_visit';
import { deriveWeekOutingSlots } from '@utils/service_outings';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { fmtDayEs } from './fmtDayEs';

type AgendaLine = {
  key: string;
  icon: ReactNode;
  title: string;
  caption?: string;
  addToCalendarUid?: string;
};

const CircuitVisitWeekAgenda = ({
  event,
  previousDay,
}: {
  event: UpcomingEventType;
  previousDay: string;
}) => {
  const visits = useAtomValue(circuitVisitsState);
  const upcomingEvents = useAtomValue(upcomingEventsState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const outingsSettings = useAtomValue(serviceOutingsSettingsState);
  const midweekTime = useAtomValue(midweekMeetingTimeState);
  const weekendTime = useAtomValue(weekendMeetingTimeState);

  const visitId = event.event_uid.replace(/^covisit_/, '').replace(/_week$/, '');
  const visit = visits.find((v) => v.id === visitId && !v._deleted);

  // Dato desincronizado/borrado: no debe romper la tarjeta. El propio
  // UpcomingEvent ya sabe pintar el "Día X/Y" genérico si esto no existe.
  if (!visit) return null;

  const weekRecord = outingsList.find((r) => r.weekOf === visit.weekOf);
  const midweekDate = schedulesGetMeetingDate({ week: visit.weekOf, meeting: 'midweek' }).date;
  const weekendDate = schedulesGetMeetingDate({ week: visit.weekOf, meeting: 'weekend' }).date;

  // Turnos efectivos de la semana (configuración + semana del CO con mié–dom
  // forzados), no solo las salidas ya materializadas con asignación.
  const weekSlots = deriveWeekOutingSlots(outingsSettings, weekRecord, visit.weekOf);

  const days = getDatesBetweenDates(visit.date_start, visit.date_end);

  return (
    <>
      {days.map((date, index) => {
        const dateStr = formatDate(date, 'yyyy/MM/dd');
        const disabled = dateStr <= previousDay;
        const lines: AgendaLine[] = [];

        const daySlots = weekSlots
          .filter((s) => s.date === dateStr && !s.cancelled)
          .toSorted((a, b) => a.time.localeCompare(b.time));

        if (daySlots.length > 0) {
          // Si todos los turnos del día salen del mismo sitio, se dice una
          // sola vez ("10:00 y 17:00 · Salón del Reino"); si no, por turno.
          const locations = new Set(daySlots.map((s) => s.location));
          const caption =
            locations.size === 1
              ? `${daySlots.map((s) => s.time).join(' y ')} · ${daySlots[0].location}`
              : daySlots.map((s) => `${s.time} ${s.location}`).join('  ·  ');

          lines.push({
            key: 'outings',
            icon: <IconMinistry color="var(--grey-400)" width={18} height={18} />,
            title: 'Salidas de predicación',
            caption,
          });
        }

        if (dateStr === midweekDate) {
          lines.push({
            key: 'midweek',
            icon: <IconGroupMeetingsSchedules color="var(--grey-400)" width={18} height={18} />,
            title: 'Reunión de entre semana',
            caption: midweekTime,
          });
        }

        if (dateStr === weekendDate) {
          lines.push({
            key: 'weekend',
            icon: <IconGroupMeetingsSchedules color="var(--grey-400)" width={18} height={18} />,
            title: 'Reunión de fin de semana',
            caption: weekendTime,
          });
        }

        // Las reuniones especiales a medias (sin hora o sin lugar) todavía
        // no se anuncian — solo las ve el coordinador en su panel.
        if (
          isSpecialMeetingComplete(visit.meeting_pioneers) &&
          dateStr === visit.meeting_pioneers.date
        ) {
          lines.push({
            key: 'pioneers',
            icon: <IconPioneerForm color="var(--grey-400)" width={18} height={18} />,
            title: 'Reunión con precursores',
            caption: `${visit.meeting_pioneers.time} · ${visit.meeting_pioneers.place}`,
            addToCalendarUid: `covisit_${visit.id}_pioneers`,
          });
        }

        if (
          isSpecialMeetingComplete(visit.meeting_elders) &&
          dateStr === visit.meeting_elders.date
        ) {
          lines.push({
            key: 'elders',
            icon: <IconOverseer color="var(--grey-400)" width={18} height={18} />,
            title: 'Reunión con ancianos y siervos ministeriales',
            caption: `${visit.meeting_elders.time} · ${visit.meeting_elders.place}`,
            addToCalendarUid: `covisit_${visit.id}_elders`,
          });
        }

        return (
          <Fragment key={dateStr}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: '88px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-s)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: disabled ? '1px dashed var(--line)' : 'none',
                  backgroundColor: disabled ? 'var(--accent-100)' : 'var(--accent-150)',
                  height: 'fit-content',
                }}
              >
                <Typography
                  className="h4"
                  color={disabled ? 'var(--accent-400)' : 'var(--accent-dark)'}
                  sx={{ textWrapMode: 'nowrap' }}
                >
                  {fmtDayEs(dateStr)}
                </Typography>
              </Box>

              <Stack spacing="6px" sx={{ flex: 1, justifyContent: 'center' }}>
                {lines.length === 0 ? (
                  <Typography
                    className="body-small-regular"
                    color={disabled ? 'var(--grey-350)' : 'var(--grey-400)'}
                  >
                    Sin actividades especiales
                  </Typography>
                ) : (
                  lines.map((line) => {
                    const calendarRecord = line.addToCalendarUid
                      ? upcomingEvents.find(
                          (e) => e.event_uid === line.addToCalendarUid
                        )
                      : undefined;

                    return (
                      <Stack
                        key={line.key}
                        direction="row"
                        spacing="8px"
                        alignItems="flex-start"
                      >
                        <Box sx={{ mt: '3px', flexShrink: 0, display: 'flex' }}>
                          {line.icon}
                        </Box>
                        <Stack spacing="1px" sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            className="body-regular-semibold"
                            color={disabled ? 'var(--grey-350)' : 'var(--ink, var(--black))'}
                          >
                            {line.title}
                          </Typography>
                          {line.caption && (
                            <Typography
                              className="body-small-regular"
                              color={disabled ? 'var(--grey-350)' : 'var(--grey-400)'}
                            >
                              {line.caption}
                            </Typography>
                          )}
                        </Stack>
                        {calendarRecord && (
                          <Box sx={{ flexShrink: 0 }}>
                            <AddToCalendar event={calendarRecord} />
                          </Box>
                        )}
                      </Stack>
                    );
                  })
                )}
              </Stack>
            </Box>

            {index + 1 !== days.length && <Divider color="var(--line)" />}
          </Fragment>
        );
      })}
    </>
  );
};

export default CircuitVisitWeekAgenda;
