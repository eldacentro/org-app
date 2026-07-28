import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import Badge from '@components/badge';
import { useCurrentUser } from '@hooks/index';
import { serviceOutingsListState } from '@states/service_outings';
import { sourcesState } from '@states/sources';
import { COFullnameState, COSpouseNameState } from '@states/settings';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { isSpecialMeetingComplete } from '@services/app/circuit_visit';
import useUpcomingCircuitVisit from '@features/circuit_visit/shared/useUpcomingCircuitVisit';
import { getEffectiveCoName } from '@features/circuit_visit/shared/getEffectiveCoName';
import { fmtDayEs, fmtRangeEs } from '@features/circuit_visit/shared/fmtDayEs';
import { CircuitVisitSpecialMeeting } from '@definition/circuit_visit';

/**
 * La semana de la visita del superintendente, para los hermanos.
 *
 * Vive en Programas semanales y no en su propia página a propósito: es donde
 * los hermanos ya entran a mirar qué toca. La página de la visita es la
 * herramienta de quien la organiza; esto es lo que necesita el resto.
 *
 * Aparece en cuanto la visita está programada y desaparece sola el día
 * después de terminar (ver useUpcomingCircuitVisit). Nunca enseña comidas,
 * pastoreo, acompañantes, documentación ni contabilidad.
 */

const Tarjeta = ({
  titulo,
  subtitulo,
  children,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  accion?: ReactNode;
}) => (
  <Box
    sx={{
      padding: '16px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-l)',
      backgroundColor: 'var(--card)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <Box>
        <Typography className="h4" color="var(--ink)">
          {titulo}
        </Typography>
        {subtitulo && (
          <Typography className="label-small-regular" color="var(--ink-2)">
            {subtitulo}
          </Typography>
        )}
      </Box>
      {accion}
    </Box>

    {children}
  </Box>
);

const Enlace = ({
  texto,
  onClick,
}: {
  texto: string;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      appearance: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      px: '10px',
      py: '4px',
      borderRadius: 'var(--radius-max)',
      border: '1px solid var(--accent-200)',
      backgroundColor: 'var(--accent-100)',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background-color 0.2s ease',
      '&:hover': { backgroundColor: 'var(--accent-200)' },
    }}
  >
    <Typography className="label-small-semibold" color="var(--accent-main)">
      {texto} →
    </Typography>
  </Box>
);

const Discurso = ({ titulo, texto }: { titulo: string; texto: string }) => (
  <Stack spacing="1px">
    <Typography className="body-small-semibold" color="var(--ink)">
      {titulo}
    </Typography>
    <Typography className="body-small-regular" color="var(--ink-2)">
      {texto || 'Sin publicar todavía'}
    </Typography>
  </Stack>
);

const ReunionEspecial = ({
  label,
  when,
}: {
  label: string;
  when: CircuitVisitSpecialMeeting;
}) => (
  <Stack spacing="1px">
    <Typography className="body-small-semibold" color="var(--ink)">
      {label}
    </Typography>
    <Typography className="body-small-regular" color="var(--ink-2)">
      {[fmtDayEs(when!.date), when!.time, when!.place]
        .filter(Boolean)
        .join(' · ')}
    </Typography>
  </Stack>
);

const CircuitVisitWeek = ({
  onGoToTab,
}: {
  /** Salta a otra pestaña del propio programa semanal. */
  onGoToTab: (id: string) => void;
}) => {
  const visit = useUpcomingCircuitVisit();

  const { isElder } = useCurrentUser();
  const coName = useAtomValue(COFullnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const sources = useAtomValue(sourcesState);

  if (!visit) return null;

  const { effectiveCoName } = getEffectiveCoName(visit, coName, coSpouseName);

  const weekRecord = outingsList.find((r) => r.weekOf === visit.weekOf);
  const weekSource = sources.find((s) => s.weekOf === visit.weekOf);

  // Solo horario y lugar — nunca quién va, que es gestión interna.
  const outingDays = getDatesBetweenDates(visit.date_start, visit.date_end)
    .map((date) => {
      const dateStr = formatDate(date, 'yyyy/MM/dd');

      return {
        dateStr,
        slots: (weekRecord?.outings ?? [])
          .filter((o) => o && o.date === dateStr && !o.cancelled)
          .toSorted((a, b) => a.time.localeCompare(b.time)),
      };
    })
    .filter((day) => day.slots.length > 0);

  const midweekTalk = weekSource?.midweek_meeting?.co_talk_title?.src ?? '';
  const publicTalk =
    weekSource?.weekend_meeting?.co_talk_title?.public?.src ?? '';
  const serviceTalk =
    weekSource?.weekend_meeting?.co_talk_title?.service?.src ?? '';

  // Las reuniones a medio rellenar no se anuncian: una fecha sin hora ni
  // lugar no es un aviso, es una duda.
  const hayPrecursores = isSpecialMeetingComplete(visit.meeting_pioneers);
  const hayAncianos =
    isElder && isSpecialMeetingComplete(visit.meeting_elders);

  return (
    <Stack spacing="12px" sx={{ marginTop: '8px' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <Typography className="h3" color="var(--ink)">
          {fmtRangeEs(visit.date_start, visit.date_end)}
        </Typography>
        <Badge text="Visita del circuito" color="accent" size="small" filled />
      </Box>

      {effectiveCoName && (
        <Typography className="body-small-regular" color="var(--ink-2)">
          {effectiveCoName}
        </Typography>
      )}

      <Tarjeta
        titulo="Reunión de entre semana"
        accion={
          <Enlace
            texto="Ver reunión completa"
            onClick={() => onGoToTab('midweek')}
          />
        }
      >
        <Discurso titulo="Discurso del superintendente" texto={midweekTalk} />
      </Tarjeta>

      <Tarjeta
        titulo="Reunión de fin de semana"
        accion={
          <Enlace
            texto="Ver reunión completa"
            onClick={() => onGoToTab('weekend')}
          />
        }
      >
        <Discurso titulo="Discurso público" texto={publicTalk} />
        <Discurso titulo="Estudio de La Atalaya" texto={serviceTalk} />
      </Tarjeta>

      {(hayPrecursores || hayAncianos) && (
        <Tarjeta titulo="Reuniones especiales">
          <Stack spacing="10px">
            {hayPrecursores && (
              <ReunionEspecial
                label="Reunión con precursores"
                when={visit.meeting_pioneers}
              />
            )}
            {hayAncianos && (
              <ReunionEspecial
                label="Reunión con ancianos y siervos ministeriales"
                when={visit.meeting_elders}
              />
            )}
          </Stack>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Salidas de predicación"
        subtitulo="Horarios de esta semana."
        accion={
          <Enlace
            texto="Ver salidas"
            onClick={() => onGoToTab('service_outings')}
          />
        }
      >
        {outingDays.length === 0 ? (
          <Typography className="body-small-regular" color="var(--ink-2)">
            Sin salidas programadas todavía.
          </Typography>
        ) : (
          <Stack spacing="8px">
            {outingDays.map((day) => (
              <Stack key={day.dateStr} spacing="1px">
                <Typography className="body-small-semibold" color="var(--ink)">
                  {fmtDayEs(day.dateStr)}
                </Typography>
                <Typography className="body-small-regular" color="var(--ink-2)">
                  {day.slots
                    .map(
                      (slot) =>
                        `${slot.time} · ${slot.location || 'Salón del Reino'}`
                    )
                    .join('  •  ')}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Tarjeta>
    </Stack>
  );
};

export default CircuitVisitWeek;
