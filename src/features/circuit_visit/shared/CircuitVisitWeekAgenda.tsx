import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
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
  COFullnameState,
  COSpouseNameState,
  midweekMeetingTimeState,
  weekendMeetingTimeState,
} from '@states/settings';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import { isSpecialMeetingComplete } from '@services/app/circuit_visit';
import { deriveWeekOutingSlots } from '@utils/service_outings';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { getEffectiveCoName } from './getEffectiveCoName';

type AgendaLine = {
  key: string;
  icon: ReactNode;
  title: string;
  caption?: string;
  addToCalendarUid?: string;
};

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
  const coName = useAtomValue(COFullnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);

  const visitId = event.event_uid.replace(/^covisit_/, '').replace(/_week$/, '');
  const visit = visits.find((v) => v.id === visitId && !v._deleted);

  // Dato desincronizado/borrado: no debe romper la tarjeta. El propio
  // UpcomingEvent ya sabe pintar el "Día X/Y" genérico si esto no existe.
  if (!visit) return null;

  const { effectiveCoName, effectiveCoSpouseName } = getEffectiveCoName(
    visit,
    coName,
    coSpouseName
  );

  const weekRecord = outingsList.find((r) => r.weekOf === visit.weekOf);
  const midweekDate = schedulesGetMeetingDate({ week: visit.weekOf, meeting: 'midweek' }).date;
  const weekendDate = schedulesGetMeetingDate({ week: visit.weekOf, meeting: 'weekend' }).date;

  // Turnos efectivos de la semana (configuración + semana del CO con mié–dom
  // forzados), no solo las salidas ya materializadas con asignación.
  const weekSlots = deriveWeekOutingSlots(outingsSettings, weekRecord, visit.weekOf);

  const days = getDatesBetweenDates(visit.date_start, visit.date_end);
  const todayStr = formatDate(new Date(), 'yyyy/MM/dd');

  return (
    <Stack spacing="0px">
      {/* Contexto de la semana: quién viene. */}
      {effectiveCoName && (
        <Typography
          className="body-small-regular"
          color="var(--grey-400)"
          sx={{ mb: '16px' }}
        >
          {`Nos visita ${effectiveCoName}${effectiveCoSpouseName ? ` junto con ${effectiveCoSpouseName}` : ''}.`}
        </Typography>
      )}

      {days.map((date, index) => {
        const dateStr = formatDate(date, 'yyyy/MM/dd');
        const disabled = dateStr <= previousDay && dateStr !== todayStr;
        const isToday = dateStr === todayStr;
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
            title:
              daySlots.length === 1
                ? 'Salida de predicación'
                : 'Salidas de predicación',
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

        const isLast = index + 1 === days.length;

        return (
          <Box
            key={dateStr}
            sx={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr',
              columnGap: '16px',
            }}
          >
            {/* Columna izquierda: ficha de calendario + hilo vertical */}
            <Stack alignItems="center">
              <Box
                sx={{
                  width: '52px',
                  padding: '6px 0 8px',
                  borderRadius: 'var(--radius-l)',
                  textAlign: 'center',
                  backgroundColor: isToday
                    ? 'var(--accent-main)'
                    : disabled
                    ? 'var(--accent-100)'
                    : 'var(--accent-150)',
                  border: disabled ? '1px dashed var(--line)' : '1px solid transparent',
                  boxShadow: isToday ? 'var(--small-card-shadow)' : 'none',
                }}
              >
                <Typography
                  className="label-small-semibold"
                  color={
                    isToday
                      ? 'var(--always-white)'
                      : disabled
                      ? 'var(--accent-400)'
                      : 'var(--accent-dark)'
                  }
                >
                  {isToday ? 'Hoy' : WEEKDAY_SHORT[date.getDay()]}
                </Typography>
                <Typography
                  className="h3"
                  color={
                    isToday
                      ? 'var(--always-white)'
                      : disabled
                      ? 'var(--accent-400)'
                      : 'var(--accent-dark)'
                  }
                >
                  {date.getDate()}
                </Typography>
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    width: '2px',
                    flex: 1,
                    minHeight: '14px',
                    backgroundColor: 'var(--line)',
                    borderRadius: 'var(--radius-max)',
                    my: '4px',
                  }}
                />
              )}
            </Stack>

            {/* Columna derecha: actividades del día */}
            <Stack
              spacing="10px"
              sx={{
                paddingTop: '4px',
                paddingBottom: isLast ? '0px' : '20px',
                minWidth: 0,
              }}
            >
              {lines.length === 0 ? (
                <Typography
                  className="body-small-regular"
                  color={disabled ? 'var(--grey-350)' : 'var(--grey-400)'}
                  sx={{ paddingTop: '10px' }}
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
        );
      })}
    </Stack>
  );
};

export default CircuitVisitWeekAgenda;
