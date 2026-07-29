import { useMemo } from 'react';
import { Box, Card, Stack, Chip } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import Typography from '@components/typography';
import AssigneeName from '../assignee_name';
import { personsStateFind } from '@services/states/persons';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userLocalUIDState,
} from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { ExhibitorWeekType } from '@definition/exhibitors';
import { exhibitorsSettingsState } from '@states/exhibitors';
import { IconCancelFilled, IconInfo } from '@components/icons';
import {
  getEffectiveTurnsForMonth,
  getMonthCancelledMessage,
  isMonthCancelled,
} from '../../../../utils/exhibitors';
import { isExhibitorMonthPublished } from '@services/app/exhibitors_publish';
import { useCurrentUser } from '@hooks/index';
import { addDays } from '@utils/date';
import { monthNamesState } from '@states/app';
import { CANCELLED_ROW_BG } from '../shared_styles';

const ExhibitorsMeeting = ({
  weekRecord,
  week,
}: {
  weekRecord?: ExhibitorWeekType;
  week: string;
}) => {
  const { t } = useAppTranslation();

  const { isServiceCommittee } = useCurrentUser();

  const settings = useAtomValue(exhibitorsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);
  const monthNames = useAtomValue(monthNamesState);

  // El mes de la semana del lunes NO sirve para toda la semana: una semana
  // que empieza en un mes y termina en otro (ej. lunes 29 de junio a domingo
  // 5 de julio) debe usar los ajustes/turnos del mes de CADA día, no el del
  // lunes para todos. Por eso effectiveTurns/monthCancelled se calculan por
  // día dentro de groupedTurns, no una sola vez aquí para toda la semana.
  const weekMonthStr = useMemo(() => {
    const targetWeek = weekRecord?.weekOf || week;
    if (!targetWeek) return '';
    return targetWeek.substring(0, 7); // "YYYY/MM" — solo para el mensaje de mes suspendido de más abajo
  }, [weekRecord, week]);

  const monthCancelled = useMemo(() => {
    return isMonthCancelled(settings, weekMonthStr);
  }, [settings, weekMonthStr]);

  const cancelledMonthMessage = useMemo(() => {
    return getMonthCancelledMessage(settings, weekMonthStr);
  }, [settings, weekMonthStr]);

  const formatLegibleDate = (date: Date): string => {
    const weekdays = [
      t('tr_sunday', 'Domingo'),
      t('tr_monday', 'Lunes'),
      t('tr_tuesday', 'Martes'),
      t('tr_wednesday', 'Miércoles'),
      t('tr_thursday', 'Jueves'),
      t('tr_friday', 'Viernes'),
      t('tr_saturday', 'Sábado'),
    ];

    return `${weekdays[date.getDay()]} ${date.getDate()} de ${monthNames[date.getMonth()]}`;
  };

  const getBrotherDisplayName = (personUid: string) => {
    if (!personUid) return '';
    const person = personsStateFind(personUid);
    if (!person) return '';
    return personGetDisplayName(person, displayNameEnabled, fullnameOption);
  };

  const groupedTurns = useMemo(() => {
    const targetWeek = weekRecord?.weekOf || week;
    if (!targetWeek) return [];

    const weekdaysOrder = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const [year, month, day] = targetWeek.split(/[-/]/).map(Number);
    // Parse to local date at NOON (12:00:00) to absolutely avoid any DST midnight shift bug
    const mondayDate = new Date(year, month - 1, day, 12, 0, 0);

    const generatedTurns = [];

    // Iterar por los 7 días de la semana
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(mondayDate, i);

      const dayLabel = weekdaysOrder[i];
      const dateStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;

      // Los turnos efectivos son los del mes de ESTE día concreto, no el
      // del lunes de la semana — así un jueves de julio usa los turnos de
      // julio aunque la semana empiece en junio.
      const dayMonthStr = dateStr.substring(0, 7);
      if (isMonthCancelled(settings, dayMonthStr)) continue;

      // Mes en BORRADOR: solo lo ve quien puede editarlo, y marcado como tal.
      // Para el resto no existe todavía — las asignaciones fijas son una
      // plantilla, no una decisión tomada.
      if (
        !isExhibitorMonthPublished(settings, dayMonthStr) &&
        !isServiceCommittee
      ) {
        continue;
      }
      const dayEffectiveTurns = getEffectiveTurnsForMonth(
        settings,
        dayMonthStr
      );

      // Encontrar los turnos configurados para este día
      const dayTurns = dayEffectiveTurns.filter((t) =>
        t.days.includes(dayLabel)
      );

      for (const turn of dayTurns) {
        // Buscar si hay un manual override guardado
        const savedTurn = weekRecord?.turns?.find(
          (t) => t.turnId === turn.id && t.date === dateStr
        );

        let finalAssignments = savedTurn?.assignments || [];
        const finalLocation =
          savedTurn?.location || turn.defaultLocation || 'Exhibidor';
        const finalCancelled = savedTurn?.cancelled || false;

        if (!savedTurn) {
          // Asignaciones fijas dinámicas
          const fixed =
            settings?.fixedAssignments?.filter(
              (f) => f.turnId === turn.id && (!f.day || f.day === dayLabel)
            ) || [];

          const sortedFixed = [...fixed].sort((a, b) => {
            const posA = a.position !== undefined ? a.position : 0;
            const posB = b.position !== undefined ? b.position : 0;
            return posA - posB;
          });

          finalAssignments = sortedFixed.map((f) => ({
            person: f.personUid,
            isResponsible: f.isResponsible,
          }));
        }

        generatedTurns.push({
          turnId: turn.id,
          date: dateStr,
          dayDate: new Date(currentDate), // clone
          startTime: turn.startTime,
          endTime: turn.endTime,
          assignments: finalAssignments,
          location: finalLocation,
          cancelled: finalCancelled,
        });
      }
    }

    if (generatedTurns.length === 0) return [];

    // Agrupar por fecha
    const groups: Record<string, typeof generatedTurns> = {};
    for (const turn of generatedTurns) {
      if (!groups[turn.date]) {
        groups[turn.date] = [];
      }
      groups[turn.date].push(turn);
    }

    return Object.keys(groups)
      .sort()
      .map((date) => {
        const sortedTurns = groups[date].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
        return {
          date,
          dayDate: groups[date][0].dayDate,
          turns: sortedTurns,
        };
      });
  }, [weekRecord, week, settings, isServiceCommittee]);

  // Sin publicar: quien puede editar lo ve igual, pero con el aviso delante
  // para que no lo confunda con algo ya decidido.
  //
  // Se mira el mes de CADA día que se está enseñando, no el del lunes: una
  // semana del 31 de agosto al 6 de septiembre enseña días de los dos meses, y
  // con el lunes mandando el editor vería los días de septiembre sin el aviso.
  const draftMonths = useMemo(() => {
    const months = new Set<string>();

    for (const group of groupedTurns) {
      const month = group.date?.substring(0, 7);

      if (month && !isExhibitorMonthPublished(settings, month)) {
        months.add(month);
      }
    }

    return [...months];
  }, [groupedTurns, settings]);

  const monthIsDraft = draftMonths.length > 0;

  // Solo mostrar el aviso de "mes suspendido" si de verdad no queda ningún
  // turno que enseñar — una semana límite (ej. termina en un mes distinto
  // al que empieza) puede tener días válidos en el otro mes.
  if (monthCancelled && groupedTurns.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '24px',
          backgroundColor: CANCELLED_ROW_BG,
          border: '1px solid var(--error-main)',
          borderRadius: 'var(--r-lg)',
          marginTop: '16px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <IconCancelFilled color="var(--error-main)" />
          <Typography
            className="body-regular"
            style={{ color: 'var(--error-main)', fontWeight: '600' }}
          >
            Los turnos de exhibidores están suspendidos este mes.
          </Typography>
        </Box>

        {cancelledMonthMessage && (
          <Typography
            className="body-regular"
            style={{
              color: 'var(--error-main)',
              textAlign: 'center',
              whiteSpace: 'pre-wrap',
            }}
          >
            {cancelledMonthMessage}
          </Typography>
        )}
      </Box>
    );
  }

  if (groupedTurns.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '24px',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          marginTop: '16px',
          justifyContent: 'center',
        }}
      >
        <IconInfo color="var(--grey-400)" />
        <Typography className="body-regular" color="var(--grey-400)">
          No hay turnos de exhibidores programados para esta semana.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing="16px" sx={{ mt: 1 }}>
      {/* Solo llega aquí quien puede editar: al resto se le han saltado los
          días de un mes sin publicar. Se avisa para que no confunda un
          borrador con algo ya decidido. */}
      {monthIsDraft && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: 'var(--orange-secondary)',
            border: '1px solid var(--orange-dark)',
            borderRadius: 'var(--r-lg)',
          }}
        >
          <IconInfo color="var(--orange-dark)" />
          <Typography className="body-small-regular" color="var(--orange-dark)">
            Mes sin publicar. Esto es un borrador: solo lo ves tú, y no le
            aparece a nadie en sus asignaciones hasta que lo publiques.
          </Typography>
        </Box>
      )}

      {groupedTurns.map(({ date, dayDate, turns }) => {
        const dayLabel = formatLegibleDate(dayDate);

        return (
          <Card
            key={date}
            sx={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--small-card-shadow)',
              overflow: 'hidden',
              transition: 'box-shadow 0.25s ease, transform 0.25s ease',
              '&:hover': {
                boxShadow: 'var(--hover-shadow)',
              },
            }}
          >
            {/* Encabezado del día */}
            <Box
              sx={{
                px: '20px',
                py: '12px',
                backgroundColor: 'var(--brand)',
                borderBottom: 'none',
              }}
            >
              <Typography
                className="h2-caps"
                sx={{
                  fontWeight: '800',
                  color: 'var(--always-white)',
                  letterSpacing: '0.6px',
                  fontSize: '14px',
                }}
              >
                {dayLabel}
              </Typography>
            </Box>

            {/* Lista de turnos */}
            <Stack sx={{ backgroundColor: 'var(--card)' }}>
              {turns.map((turn, idx) => {
                const timeRange = `${turn.startTime} - ${turn.endTime}`;
                const isAssignedToMe = turn.assignments?.some(
                  (a) => a.person === userUID
                );
                const isCancelled = turn.cancelled;

                return (
                  <Box
                    key={turn.turnId}
                    sx={{
                      display: 'flex',
                      flexDirection: { mobile: 'column', laptop: 'row' },
                      alignItems: { mobile: 'stretch', laptop: 'center' },
                      gap: { mobile: '12px', laptop: '20px' },
                      px: '20px',
                      py: '18px',
                      borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                      backgroundColor: isCancelled
                        ? CANCELLED_ROW_BG
                        : isAssignedToMe
                          ? 'var(--accent-150)'
                          : 'var(--card)',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Hora */}
                    <Box
                      sx={{
                        minWidth: { mobile: '0px', laptop: '110px' },
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: '800',
                          fontSize: '15px',
                          color: isCancelled
                            ? 'var(--grey-500)'
                            : 'var(--brand)',
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {timeRange}
                      </Typography>
                    </Box>

                    {/* Divisor vertical */}
                    <Box
                      sx={{
                        width: '1px',
                        alignSelf: 'stretch',
                        backgroundColor: 'var(--line)',
                        display: { mobile: 'none', laptop: 'block' },
                      }}
                    />

                    {/* Hermanos asignados */}
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        width: { mobile: '100%', laptop: 'auto' },
                        minWidth: 0,
                      }}
                    >
                      {isCancelled ? (
                        <Chip
                          icon={<IconCancelFilled color="var(--error-main)" />}
                          label="Suspendido"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--error-150)',
                            color: 'var(--error-dark)',
                            fontWeight: '700',
                            alignSelf: 'flex-start',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          {/* Solo el primero del turno debe llevar la etiqueta
                              de responsable, aunque los demás también estén
                              habilitados — si datos antiguos tuvieran más de
                              uno marcado como responsable, esto evita que se
                              vea más de una etiqueta a la vez. */}
                          {(() => {
                            const firstResponsibleIdx =
                              turn.assignments?.findIndex(
                                (a) => a.isResponsible
                              ) ?? -1;
                            return turn.assignments?.map((ass, aIdx) => {
                              // Antes, si el nombre no se podía resolver (p.ej.
                              // el registro de la persona aún no había
                              // terminado de sincronizar en este dispositivo),
                              // la asignación desaparecía sin ningún aviso —
                              // parecía que "no salía la asignación". Si hay
                              // una persona asignada, siempre se muestra algo.
                              if (!ass.person) return null;
                              const name =
                                getBrotherDisplayName(ass.person) ||
                                'Hermano asignado';
                              const isMe = ass.person === userUID;
                              const accentColor = 'var(--brand)';

                              return (
                                <AssigneeName
                                  key={aIdx}
                                  name={name}
                                  isMe={isMe}
                                  color={accentColor}
                                  singleLine
                                  trailing={
                                    ass.isResponsible &&
                                    aIdx === firstResponsibleIdx ? (
                                      <Typography
                                        className="label-small-semibold"
                                        color="var(--brand)"
                                      >
                                        Resp.
                                      </Typography>
                                    ) : undefined
                                  }
                                />
                              );
                            });
                          })()}
                          {(!turn.assignments ||
                            turn.assignments.length === 0) && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 'var(--radius-xl)',
                                border: '1px dashed var(--line)',
                                borderLeft: '4px dashed var(--grey-300)',
                                backgroundColor:
                                  'rgba(var(--grey-100-base), 0.03)',
                                padding: '6px 12px',
                              }}
                            >
                              <Typography
                                className="body-small-medium"
                                color="var(--grey-350)"
                                sx={{
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  letterSpacing: '0.2px',
                                }}
                              >
                                Sin asignar
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Lugar */}
                    <Box
                      sx={{
                        textAlign: { mobile: 'left', laptop: 'right' },
                        width: { mobile: '100%', laptop: 'auto' },
                        minWidth: { mobile: '0px', laptop: '180px' },
                        maxWidth: { mobile: '100%', laptop: '260px' },
                        flexShrink: { mobile: 1, laptop: 0 },
                        alignSelf: { mobile: 'flex-start', laptop: 'center' },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: isCancelled
                            ? 'var(--grey-400)'
                            : 'var(--grey-600)',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          mt: { mobile: '4px', laptop: '0px' },
                          lineHeight: '1.4',
                        }}
                      >
                        {isCancelled ? '—' : turn.location}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
};

export default ExhibitorsMeeting;
