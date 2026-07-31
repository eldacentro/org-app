import { ReactNode } from 'react';
import { MESES_ES } from '@utils/nombres_fecha';
import { Box, Card, Stack } from '@mui/material';
import { useAtomValue, useSetAtom } from 'jotai';
import Typography from '@components/typography';
import {
  IconCircuitOverseer,
  IconPodium,
  IconTreasuresPart,
  IconInTerritory,
  IconCalendarWeek,
} from '@components/icons';
import MeetingSection from '@features/meetings/meeting_section';
import {
  serviceOutingsListState,
  serviceOutingsSettingsState,
} from '@states/service_outings';
import { deriveWeekOutingSlots } from '@utils/service_outings';
import { sourcesState } from '@states/sources';
import { jumpToWeekState } from '@states/schedules';
import { COFullnameState, COSpouseNameState } from '@states/settings';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { isSpecialMeetingComplete } from '@services/app/circuit_visit';
import { schedulesGetMeetingDate } from '@services/app/schedules';
import useUpcomingCircuitVisit from '@features/circuit_visit/shared/useUpcomingCircuitVisit';
import { getEffectiveCoName } from '@features/circuit_visit/shared/getEffectiveCoName';
import { CircuitVisitSpecialMeeting } from '@definition/circuit_visit';
import ActionPill from '@components/action_pill';

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
 *
 * Usa el MISMO lenguaje que las demás pestañas —MeetingSection con su cabecera
 * de color, y las salidas con tarjetas por día— para que no se note que es
 * otra pantalla.
 */

const DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const MESES = [...MESES_ES];

/** "martes 28 de julio" — la fecha entera, sin abreviar. */
const fechaLarga = (fecha: string) => {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;

  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

/** "Del martes 28 de julio al domingo 2 de agosto de 2026". */
const rangoLargo = (inicio: string, fin: string) => {
  const d = new Date(fin);
  const anio = Number.isNaN(d.getTime()) ? '' : ` de ${d.getFullYear()}`;

  return `Del ${fechaLarga(inicio)} al ${fechaLarga(fin)}${anio}`;
};

const Fila = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <Stack spacing="2px">
    <Typography className="label-small-medium" color="var(--grey-400)">
      {etiqueta}
    </Typography>
    <Typography className="body-regular-semibold" color="var(--ink)">
      {valor || 'Sin publicar todavía'}
    </Typography>
  </Stack>
);

// La misma píldora que el resto de la aplicación. En variante `tinted`
// porque va DENTRO de una tarjeta: rellena competiría con la propia tarjeta y
// con la acción principal de la pantalla.
const Boton = ({ texto, onClick }: { texto: string; onClick: () => void }) => (
  <ActionPill label={texto} onClick={onClick} variant="tinted" trailing=" →" />
);

const Contenido = ({ children }: { children: ReactNode }) => (
  <Stack spacing="16px" sx={{ padding: '16px 20px 20px' }}>
    {children}
  </Stack>
);

const ReunionEspecial = ({
  label,
  when,
}: {
  label: string;
  when: CircuitVisitSpecialMeeting;
}) => (
  <Stack spacing="2px">
    <Typography className="body-regular-semibold" color="var(--ink)">
      {label}
    </Typography>
    <Typography className="body-small-regular" color="var(--grey-400)">
      {[fechaLarga(when!.date), when!.time, when!.place]
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

  const coName = useAtomValue(COFullnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const outingsSettings = useAtomValue(serviceOutingsSettingsState);
  const sources = useAtomValue(sourcesState);
  const setJumpToWeek = useSetAtom(jumpToWeekState);

  if (!visit) return null;

  const { effectiveCoName, effectiveCoSpouseName } = getEffectiveCoName(
    visit,
    coName,
    coSpouseName
  );

  // Ir a otra pestaña Y a la semana de la visita. Sin lo segundo se aterrizaba
  // en la semana que esa pestaña tuviera puesta, que casi nunca es esta.
  const irA = (id: string) => {
    setJumpToWeek(visit.weekOf);
    onGoToTab(id);
  };

  const weekRecord = outingsList.find((r) => r.weekOf === visit.weekOf);
  const weekSource = sources.find((s) => s.weekOf === visit.weekOf);

  const weekSlots = deriveWeekOutingSlots(
    outingsSettings,
    weekRecord,
    visit.weekOf
  );

  // Solo horario y lugar — nunca quién va, que es gestión interna.
  const outingDays = getDatesBetweenDates(visit.date_start, visit.date_end)
    .map((date) => {
      const dateStr = formatDate(date, 'yyyy/MM/dd');

      return {
        dateStr,
        slots: weekSlots
          .filter((slot) => slot.date === dateStr && !slot.cancelled)
          .toSorted((a, b) => a.time.localeCompare(b.time)),
      };
    })
    .filter((day) => day.slots.length > 0);

  const midweekTalk = weekSource?.midweek_meeting?.co_talk_title?.src ?? '';
  const publicTalk =
    weekSource?.weekend_meeting?.co_talk_title?.public?.src ?? '';
  // El SEGUNDO discurso del fin de semana. El superintendente da dos ese día:
  // el público y el de servicio, que sustituye al estudio de La Atalaya. No
  // es el estudio, y llamarlo así confundía.
  const serviceTalk =
    weekSource?.weekend_meeting?.co_talk_title?.service?.src ?? '';

  // La fecha real de cada reunión (incluye el salto a martes de la semana de
  // la visita), con el mismo formato largo que el rango de arriba: mezclar
  // "Julio 28" con "martes 28 de julio" en la misma tarjeta se lee mal.
  const midweekDate = schedulesGetMeetingDate({
    week: visit.weekOf,
    meeting: 'midweek',
    dataView: 'main',
  });

  const weekendDate = schedulesGetMeetingDate({
    week: visit.weekOf,
    meeting: 'weekend',
    dataView: 'main',
  });

  // Las reuniones a medio rellenar no se anuncian: una fecha sin hora ni
  // lugar no es un aviso, es una duda.
  const hayPrecursores = isSpecialMeetingComplete(visit.meeting_pioneers);
  const hayAncianos = isSpecialMeetingComplete(visit.meeting_elders);

  return (
    <Stack spacing="16px" sx={{ marginTop: '8px' }}>
      {/* Cabecera de la visita */}
      <Card
        sx={{
          border: '1px solid var(--accent-200)',
          borderRadius: 'var(--shape-md)',
          boxShadow: 'var(--small-card-shadow)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            px: '20px',
            py: '14px',
            backgroundColor: 'var(--accent-main)',
          }}
        >
          <IconCircuitOverseer
            color="var(--always-white)"
            width={26}
            height={26}
          />
          {/* Mismo peso y mismo espaciado que `MeetingSection`, que es quien
              dibuja TODAS las demás bandas de la página —incluidas las dos que
              van justo debajo de esta—: 700 y medio punto. Iba a 800, y al
              lado de "REUNIÓN DE ENTRE SEMANA" se notaba más gorda.

              Y dice solo "Superintendente". Medido a 20,5px, que es el tamaño
              en móvil: "SUPERINTENDENTE DE CIRCUITO" pide 359px y en un
              teléfono de 360 no cabe ni de lejos; "SUPERINTENDENTE" pide 210,
              menos que "REUNIÓN DE ENTRE SEMANA" (312), que es la banda más
              larga que ya tiene la página. De qué superintendente hablamos lo
              dice la pestaña, que se llama "Visita del superintendente". */}
          <Typography
            className="h2-caps"
            sx={{
              color: 'var(--always-white)',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            Superintendente
          </Typography>
        </Box>

        <Stack spacing="8px" sx={{ padding: '18px 20px 20px' }}>
          <Typography className="h2" color="var(--ink)">
            {effectiveCoName || 'Superintendente de circuito'}
          </Typography>

          {effectiveCoSpouseName && (
            <Typography className="body-regular" color="var(--grey-400)">
              Le acompaña su esposa, {effectiveCoSpouseName}.
            </Typography>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px',
            }}
          >
            <IconCalendarWeek
              color="var(--accent-main)"
              width={18}
              height={18}
            />
            <Typography className="body-regular-semibold" color="var(--ink-2)">
              {rangoLargo(visit.date_start, visit.date_end)}
            </Typography>
          </Box>
        </Stack>
      </Card>

      <MeetingSection
        part="Reunión de entre semana"
        color="var(--midweek-meeting)"
        icon={<IconTreasuresPart color="var(--always-white)" />}
        alwaysExpanded
      >
        <Contenido>
          <Fila
            etiqueta="Cuándo"
            valor={midweekDate.date ? fechaLarga(midweekDate.date) : ''}
          />
          <Fila etiqueta="Discurso del superintendente" valor={midweekTalk} />
          <Boton texto="Ver reunión completa" onClick={() => irA('midweek')} />
        </Contenido>
      </MeetingSection>

      <MeetingSection
        part="Reunión de fin de semana"
        color="var(--weekend-meeting)"
        icon={<IconPodium color="var(--always-white)" />}
        alwaysExpanded
      >
        <Contenido>
          <Fila
            etiqueta="Cuándo"
            valor={weekendDate.date ? fechaLarga(weekendDate.date) : ''}
          />

          <Typography className="body-small-regular" color="var(--grey-400)">
            El superintendente da los dos discursos de esta reunión.
          </Typography>

          <Fila etiqueta="Discurso público" valor={publicTalk} />
          <Fila etiqueta="Discurso de servicio" valor={serviceTalk} />

          <Boton texto="Ver reunión completa" onClick={() => irA('weekend')} />
        </Contenido>
      </MeetingSection>

      {(hayPrecursores || hayAncianos) && (
        <MeetingSection
          part="Reuniones especiales"
          color="var(--accent-dark)"
          icon={<IconCalendarWeek color="var(--always-white)" />}
          alwaysExpanded
        >
          <Contenido>
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
          </Contenido>
        </MeetingSection>
      )}

      <MeetingSection
        part="Salidas de predicación"
        color="var(--apply-yourself-to-the-field-ministry)"
        icon={<IconInTerritory color="var(--always-white)" />}
        alwaysExpanded
      >
        <Contenido>
          {outingDays.length === 0 ? (
            <Typography className="body-regular" color="var(--grey-400)">
              Sin salidas programadas todavía.
            </Typography>
          ) : (
            <Stack spacing="8px">
              {outingDays.map((day) => (
                <Box
                  key={day.dateStr}
                  sx={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--shape-sm)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      px: '14px',
                      py: '8px',
                      backgroundColor: 'var(--accent-100)',
                    }}
                  >
                    <Typography
                      className="body-small-semibold"
                      color="var(--accent-dark)"
                    >
                      {fechaLarga(day.dateStr)}
                    </Typography>
                  </Box>

                  <Stack sx={{ backgroundColor: 'var(--card)' }}>
                    {day.slots.map((slot, idx) => (
                      <Box
                        key={`${slot.date}_${slot.time}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          px: '14px',
                          py: '10px',
                          borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                        }}
                      >
                        <Typography
                          className="body-small-semibold"
                          color="var(--accent-main)"
                          sx={{ minWidth: '46px' }}
                        >
                          {slot.time}
                        </Typography>
                        <Typography
                          className="body-small-regular"
                          color="var(--ink-2)"
                        >
                          {slot.location || 'Salón del Reino'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <Boton texto="Ver salidas" onClick={() => irA('service_outings')} />
        </Contenido>
      </MeetingSection>
    </Stack>
  );
};

export default CircuitVisitWeek;
