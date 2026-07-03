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
import { serviceOutingsListState } from '@states/service_outings';
import {
  midweekMeetingTimeState,
  weekendMeetingTimeState,
} from '@states/settings';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { fmtDayEs } from './fmtDayEs';

type AgendaLine = {
  key: string;
  icon: ReactNode;
  text: string;
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

  const days = getDatesBetweenDates(visit.date_start, visit.date_end);

  return (
    <>
      {days.map((date, index) => {
        const dateStr = formatDate(date, 'yyyy/MM/dd');
        const disabled = dateStr <= previousDay;
        const lines: AgendaLine[] = [];

        const outings = (weekRecord?.outings ?? [])
          .filter((o) => o.date === dateStr && !o.cancelled)
          .toSorted((a, b) => a.time.localeCompare(b.time));

        if (outings.length > 0) {
          lines.push({
            key: 'outings',
            icon: <IconMinistry color="var(--grey-400)" width={16} height={16} />,
            text: outings
              .map((o) => `${o.time} — ${o.location || 'Salón del Reino'}`)
              .join('  •  '),
          });
        }

        if (dateStr === midweekDate) {
          lines.push({
            key: 'midweek',
            icon: <IconGroupMeetingsSchedules color="var(--grey-400)" width={16} height={16} />,
            text: `Reunión de entre semana — ${midweekTime}`,
          });
        }

        if (dateStr === weekendDate) {
          lines.push({
            key: 'weekend',
            icon: <IconGroupMeetingsSchedules color="var(--grey-400)" width={16} height={16} />,
            text: `Reunión de fin de semana — ${weekendTime}`,
          });
        }

        if (visit.meeting_pioneers && dateStr === visit.meeting_pioneers.date) {
          const parts = [visit.meeting_pioneers.time, visit.meeting_pioneers.place].filter(Boolean);
          lines.push({
            key: 'pioneers',
            icon: <IconPioneerForm color="var(--grey-400)" width={16} height={16} />,
            text: `Reunión con precursores — ${parts.join(' • ')}`,
            addToCalendarUid: `covisit_${visit.id}_pioneers`,
          });
        }

        if (visit.meeting_elders && dateStr === visit.meeting_elders.date) {
          const parts = [visit.meeting_elders.time, visit.meeting_elders.place].filter(Boolean);
          lines.push({
            key: 'elders',
            icon: <IconOverseer color="var(--grey-400)" width={16} height={16} />,
            text: `Reunión con ancianos y SM — ${parts.join(' • ')}`,
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
                  lines.map((line) => (
                    <Stack key={line.key} spacing="4px">
                      <Stack direction="row" spacing="6px" alignItems="center">
                        {line.icon}
                        <Typography
                          className="body-small-regular"
                          color={disabled ? 'var(--grey-350)' : 'var(--black)'}
                        >
                          {line.text}
                        </Typography>
                      </Stack>
                      {line.addToCalendarUid &&
                        (() => {
                          const record = upcomingEvents.find(
                            (e) => e.event_uid === line.addToCalendarUid
                          );
                          return record ? (
                            <Box sx={{ maxWidth: '200px' }}>
                              <AddToCalendar event={record} />
                            </Box>
                          ) : null;
                        })()}
                    </Stack>
                  ))
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
