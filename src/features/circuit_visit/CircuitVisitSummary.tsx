import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import PageTitle from '@components/page_title';
import Typography from '@components/typography';
import { CircuitVisitType } from '@definition/circuit_visit';
import {
  COFullnameState,
  COSpouseNameState,
  congFullnameState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import { personsState } from '@states/persons';
import { serviceOutingsListState } from '@states/service_outings';
import { sourcesState } from '@states/sources';
import { personGetDisplayName } from '@utils/common';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { CircuitVisitAccessTier } from './useCircuitVisitAccess';
import { getEffectiveCoName } from './shared/getEffectiveCoName';
import Card from './shared/Card';

const fmtRange = (visit: CircuitVisitType) => {
  try {
    const start = formatDate(new Date(visit.date_start), 'd MMM');
    const end = formatDate(new Date(visit.date_end), 'd MMM yyyy');
    return `${start} – ${end}`;
  } catch {
    return visit.weekOf;
  }
};

const fmtDay = (date: string) => {
  if (!date) return '—';
  try {
    return formatDate(new Date(date), 'EEE d MMM');
  } catch {
    return date;
  }
};

const SpecialMeetingRow = ({
  label,
  when,
}: {
  label: string;
  when: { date: string; time: string; place: string } | null;
}) => {
  if (!when || !when.date) return null;

  const parts = [fmtDay(when.date), when.time, when.place].filter(Boolean);

  return (
    <Stack spacing="1px" mb="8px">
      <Typography className="body-regular-semibold">{label}</Typography>
      <Typography className="body-small-regular" color="var(--grey-400)">
        {parts.join('  •  ')}
      </Typography>
    </Stack>
  );
};

const CircuitVisitSummary = ({
  visit,
  tier,
}: {
  visit: CircuitVisitType;
  tier: Extract<CircuitVisitAccessTier, 'elder' | 'public'>;
}) => {
  const coName = useAtomValue(COFullnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);
  const congName = useAtomValue(congFullnameState);
  const persons = useAtomValue(personsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const sources = useAtomValue(sourcesState);

  const { effectiveCoName, effectiveCoSpouseName } = getEffectiveCoName(
    visit,
    coName,
    coSpouseName
  );

  const weekRecord = outingsList.find((r) => r.weekOf === visit.weekOf);
  const weekSource = sources.find((s) => s.weekOf === visit.weekOf);

  // Solo horario y lugar — nunca quién va, eso es gestión interna.
  const outingDays = getDatesBetweenDates(visit.date_start, visit.date_end).map((date) => {
    const dateStr = formatDate(date, 'yyyy/MM/dd');
    const slots = (weekRecord?.outings ?? [])
      .filter((o) => o.date === dateStr && !o.cancelled)
      .toSorted((a, b) => a.time.localeCompare(b.time));

    return { dateStr, slots };
  });

  const midweekTalkTitle = weekSource?.midweek_meeting?.co_talk_title?.src ?? '';
  const weekendPublicTalkTitle = weekSource?.weekend_meeting?.co_talk_title?.public?.src ?? '';
  const weekendServiceTalkTitle = weekSource?.weekend_meeting?.co_talk_title?.service?.src ?? '';

  const findPersonName = (uid: string) => {
    if (!uid) return '';
    const person = persons.find((p) => p.person_uid === uid);
    return person ? personGetDisplayName(person, displayNameEnabled, fullnameOption) : '';
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
      <PageTitle title="Visita del Superintendente de Circuito" />

      <Stack spacing="16px" mt="16px">
        <Card title={effectiveCoName || 'Superintendente de circuito'} subtitle={fmtRange(visit)}>
          {effectiveCoSpouseName && (
            <Typography className="body-regular" color="var(--grey-400)">
              Con {effectiveCoSpouseName}
            </Typography>
          )}
        </Card>

        <Card
          title="Salidas de predicación"
          subtitle="Horarios de esta semana. Para ver quién sale, consulta Salidas de predicación."
        >
          <Stack spacing="10px">
            {outingDays.every((d) => d.slots.length === 0) ? (
              <Typography className="body-regular" color="var(--grey-400)">
                Sin salidas programadas.
              </Typography>
            ) : (
              outingDays
                .filter((d) => d.slots.length > 0)
                .map((d) => (
                  <Stack key={d.dateStr} spacing="2px">
                    <Typography className="body-regular-semibold">{fmtDay(d.dateStr)}</Typography>
                    <Typography className="body-small-regular" color="var(--grey-400)">
                      {d.slots.map((s) => `${s.time} — ${s.location || 'Salón del Reino'}`).join('  •  ')}
                    </Typography>
                  </Stack>
                ))
            )}
          </Stack>
        </Card>

        <Card title="Discursos del superintendente">
          <Stack spacing="8px">
            <Stack spacing="1px">
              <Typography className="body-regular-semibold">Entre semana</Typography>
              <Typography className="body-small-regular" color="var(--grey-400)">
                {midweekTalkTitle || 'Sin publicar todavía'}
              </Typography>
            </Stack>
            <Stack spacing="1px">
              <Typography className="body-regular-semibold">Discurso público</Typography>
              <Typography className="body-small-regular" color="var(--grey-400)">
                {weekendPublicTalkTitle || 'Sin publicar todavía'}
              </Typography>
            </Stack>
            <Stack spacing="1px">
              <Typography className="body-regular-semibold">Estudio de La Atalaya</Typography>
              <Typography className="body-small-regular" color="var(--grey-400)">
                {weekendServiceTalkTitle || 'Sin publicar todavía'}
              </Typography>
            </Stack>
          </Stack>
        </Card>

        {(visit.meeting_pioneers || visit.meeting_elders) && (
          <Card title="Reuniones especiales">
            <SpecialMeetingRow label="Reunión con precursores" when={visit.meeting_pioneers} />
            <SpecialMeetingRow
              label="Reunión con ancianos y siervos ministeriales"
              when={visit.meeting_elders}
            />
          </Card>
        )}

        {tier === 'elder' && (
          <>
            <Card title="Programa de comidas" subtitle="Anfitriones por día.">
              {visit.meals.length === 0 ? (
                <Typography className="body-regular" color="var(--grey-400)">
                  Sin comidas asignadas.
                </Typography>
              ) : (
                <Stack spacing="6px">
                  {visit.meals.map((meal) => (
                    <Typography key={meal.id} className="body-small-regular">
                      {fmtDay(meal.date)} — {findPersonName(meal.host) || '—'}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Card>

            <Card title="Compañía del superintendente" subtitle="En las salidas de predicación.">
              {visit.co_companions.length === 0 ? (
                <Typography className="body-regular" color="var(--grey-400)">
                  Sin compañía asignada todavía.
                </Typography>
              ) : (
                <Stack spacing="6px">
                  {visit.co_companions.map((c) => {
                    const [date] = c.outingKey.split('_');
                    return (
                      <Typography key={c.outingKey} className="body-small-regular">
                        {fmtDay(date)} — {findPersonName(c.brother) || '—'}
                        {c.withWife && effectiveCoSpouseName ? `  •  Con ${effectiveCoSpouseName}` : ''}
                      </Typography>
                    );
                  })}
                </Stack>
              )}
            </Card>

            <Card title="Visitas de pastoreo">
              {(visit.shepherding_visits ?? []).length === 0 ? (
                <Typography className="body-regular" color="var(--grey-400)">
                  Sin visitas de pastoreo programadas.
                </Typography>
              ) : (
                <Stack spacing="6px">
                  {(visit.shepherding_visits ?? []).map((sv) => (
                    <Typography key={sv.id} className="body-small-regular">
                      {fmtDay(sv.date)} · {sv.time || '—'} — {findPersonName(sv.brother) || '—'}
                      {sv.elder ? ` (con ${findPersonName(sv.elder)})` : ''}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Card>
          </>
        )}

        <Typography className="body-small-regular" color="var(--grey-400)" sx={{ textAlign: 'center', pt: '4px' }}>
          {congName}
        </Typography>
      </Stack>
    </Box>
  );
};

export default CircuitVisitSummary;
