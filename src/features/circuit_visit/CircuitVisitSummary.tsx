import { useMemo } from 'react';
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
  userLocalUIDState,
} from '@states/settings';
import { ACTIVITY_LABELS } from './shared/activityLabels';
import { personsState } from '@states/persons';
import { serviceOutingsListState } from '@states/service_outings';
import { sourcesState } from '@states/sources';
import { personGetDisplayName } from '@utils/common';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import { CircuitVisitAccessTier } from './useCircuitVisitAccess';
import { getEffectiveCoName } from './shared/getEffectiveCoName';
import { fmtDayEs, fmtRangeEs } from './shared/fmtDayEs';
import Card from './shared/Card';

const fmtDay = fmtDayEs;

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

  // Asignaciones personales del usuario en ESTA visita. Se muestran en ambos
  // niveles (anciano y publicador): un anfitrión de comida o un acompañante
  // del CO que no es anciano no tiene otra forma de ver lo suyo.
  const myUid = useAtomValue(userLocalUIDState);

  const myAssignments = useMemo(() => {
    const items: { key: string; primary: string; secondary: string }[] = [];
    if (!myUid) return items;

    for (const meal of visit.meals) {
      if (meal.host === myUid) {
        items.push({
          key: `meal_${meal.id}`,
          primary: 'Anfitrión de comida para el superintendente',
          secondary: `${fmtDay(meal.date)}${meal.note ? `  •  ${meal.note}` : ''}`,
        });
      }
    }

    for (const c of visit.co_companions) {
      const [date, time] = c.outingKey.split('_');
      const when = `${fmtDay(date)} · ${time}`;

      if (c.brother === myUid) {
        items.push({
          key: `comp_${c.outingKey}`,
          primary: 'Acompañas al superintendente en la predicación',
          secondary: `${when}  •  ${ACTIVITY_LABELS[c.activity] ?? ''}`,
        });
      }

      if ((c.spouse_companions ?? []).includes(myUid)) {
        items.push({
          key: `spouse_${c.outingKey}`,
          primary: `Acompañas a ${effectiveCoSpouseName || 'la esposa del superintendente'} en la predicación`,
          secondary: when,
        });
      }
    }

    for (const sv of visit.shepherding_visits ?? []) {
      const when = `${fmtDay(sv.date)}${sv.time ? ` · ${sv.time}` : ''}`;

      if (sv.brother === myUid) {
        items.push({
          key: `shep_${sv.id}`,
          primary: 'El superintendente te hará una visita de pastoreo',
          secondary: when,
        });
      }

      if (sv.elder === myUid && sv.brother !== myUid) {
        items.push({
          key: `shep_elder_${sv.id}`,
          primary: `Acompañas al superintendente en la visita de pastoreo a ${findPersonName(sv.brother) || '—'}`,
          secondary: when,
        });
      }
    }

    return items;
    // findPersonName depende de persons/displayNameEnabled/fullnameOption.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit, myUid, effectiveCoSpouseName, persons, displayNameEnabled, fullnameOption]);

  return (
    <Box sx={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
      <PageTitle title="Visita del Superintendente de Circuito" />

      <Stack spacing="16px" mt="16px">
        <Card
          title={effectiveCoName || 'Superintendente de circuito'}
          subtitle={fmtRangeEs(visit.date_start, visit.date_end)}
        >
          {effectiveCoSpouseName && (
            <Typography className="body-regular" color="var(--grey-400)">
              Con {effectiveCoSpouseName}
            </Typography>
          )}
        </Card>

        {myAssignments.length > 0 && (
          <Card
            title="Tus asignaciones"
            subtitle="Lo que tienes asignado durante esta visita."
          >
            <Stack spacing="10px">
              {myAssignments.map((item) => (
                <Stack key={item.key} spacing="1px">
                  <Typography className="body-regular-semibold">
                    {item.primary}
                  </Typography>
                  <Typography
                    className="body-small-regular"
                    color="var(--grey-400)"
                  >
                    {item.secondary}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        )}

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

        {/* La reunión con precursores es de interés general (los precursores
            son publicadores); la de ancianos y SM solo se muestra a ancianos. */}
        {(visit.meeting_pioneers || (tier === 'elder' && visit.meeting_elders)) && (
          <Card title="Reuniones especiales">
            <SpecialMeetingRow label="Reunión con precursores" when={visit.meeting_pioneers} />
            {tier === 'elder' && (
              <SpecialMeetingRow
                label="Reunión con ancianos y siervos ministeriales"
                when={visit.meeting_elders}
              />
            )}
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
