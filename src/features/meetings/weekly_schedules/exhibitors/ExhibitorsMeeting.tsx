import { useMemo } from 'react';
import { Box, Card, Stack, Chip } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import Typography from '@components/typography';
import { personsStateFind } from '@services/states/persons';
import { displayNameMeetingsEnableState, fullnameOptionState, userLocalUIDState } from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { ExhibitorWeekType } from '@definition/exhibitors';
import { exhibitorsSettingsState } from '@states/exhibitors';
import { IconCancelFilled, IconInfo } from '@components/icons';
import { getEffectiveTurnsForMonth, isMonthCancelled } from '../../../../utils/exhibitors';
import { addDays } from '@utils/date';

const ExhibitorsMeeting = ({ weekRecord, week }: { weekRecord?: ExhibitorWeekType, week: string }) => {
  const { t } = useAppTranslation();

  const settings = useAtomValue(exhibitorsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

  const monthStr = useMemo(() => {
    const targetWeek = weekRecord?.weekOf || week;
    if (!targetWeek) return '';
    return targetWeek.substring(0, 7); // "YYYY/MM"
  }, [weekRecord, week]);

  const effectiveTurns = useMemo(() => {
    return getEffectiveTurnsForMonth(settings, monthStr);
  }, [settings, monthStr]);

  const monthCancelled = useMemo(() => {
    return isMonthCancelled(settings, monthStr);
  }, [settings, monthStr]);

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
    
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    return `${weekdays[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
  };

  const getBrotherDisplayName = (personUid: string) => {
    if (!personUid) return '';
    const person = personsStateFind(personUid);
    if (!person) return '';
    return personGetDisplayName(person, displayNameEnabled, fullnameOption);
  };

  const groupedTurns = useMemo(() => {
    if (!effectiveTurns || effectiveTurns.length === 0) return [];
    
    const targetWeek = weekRecord?.weekOf || week;
    if (!targetWeek) return [];

    const weekdaysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const [year, month, day] = targetWeek.split(/[-/]/).map(Number);
    // Parse to local date at NOON (12:00:00) to absolutely avoid any DST midnight shift bug
    const mondayDate = new Date(year, month - 1, day, 12, 0, 0);

    const generatedTurns = [];

    // Iterar por los 7 días de la semana
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(mondayDate, i);
      
      const dayLabel = weekdaysOrder[i];
      const dateStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;

      // Encontrar los turnos configurados para este día
      const dayTurns = effectiveTurns.filter((t) => t.days.includes(dayLabel));

      for (const turn of dayTurns) {
        // Buscar si hay un manual override guardado
        const savedTurn = weekRecord?.turns?.find((t) => t.turnId === turn.id && t.date === dateStr);

        let finalAssignments = savedTurn?.assignments || [];
        const finalLocation = savedTurn?.location || turn.defaultLocation || 'Exhibidor';
        const finalCancelled = savedTurn?.cancelled || false;

        if (!savedTurn) {
          // Asignaciones fijas dinámicas
          const fixed = settings?.fixedAssignments?.filter((f) => 
            f.turnId === turn.id && (!f.day || f.day === dayLabel)
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
        const sortedTurns = groups[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
        return {
          date,
          dayDate: groups[date][0].dayDate,
          turns: sortedTurns,
        };
      });
  }, [weekRecord, week, effectiveTurns, settings]);

  if (monthCancelled) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '24px',
          backgroundColor: '#fce8e6',
          border: '1px solid var(--error-main)',
          borderRadius: 'var(--r-lg)',
          marginTop: '16px',
          justifyContent: 'center',
        }}
      >
        <IconCancelFilled color="var(--error-main)" />
        <Typography className="body-regular" style={{ color: 'var(--error-main)', fontWeight: '600' }}>
          Los turnos de exhibidores están suspendidos este mes.
        </Typography>
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
    <Stack spacing="20px" sx={{ mt: 1 }}>
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
                  fontSize: '14px'
                }}
              >
                {dayLabel}
              </Typography>
            </Box>

            {/* Lista de turnos */}
            <Stack sx={{ backgroundColor: 'var(--card)' }}>
              {turns.map((turn, idx) => {
                const timeRange = `${turn.startTime} - ${turn.endTime}`;
                const isAssignedToMe = turn.assignments?.some((a) => a.person === userUID);
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
                        ? '#fce8e6'
                        : isAssignedToMe
                        ? 'var(--accent-50, #f0f7ff)'
                        : 'var(--card)',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Hora */}
                    <Box sx={{ minWidth: { mobile: '0px', laptop: '110px' }, flexShrink: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: '800',
                          fontSize: '15px',
                          color: isCancelled ? 'var(--grey-500)' : 'var(--brand)',
                          textDecoration: isCancelled ? 'line-through' : 'none',
                          letterSpacing: '0.2px'
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {turn.assignments?.map((ass, aIdx) => {
                            const name = getBrotherDisplayName(ass.person);
                            if (!name) return null;
                            const isMe = ass.person === userUID;
                            const accentColor = 'var(--brand)';

                            return (
                              <Box 
                                key={aIdx} 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  borderRadius: 'var(--radius-xl)',
                                  border: isMe 
                                    ? '1.5px solid var(--brand)' 
                                    : '1px solid var(--line)',
                                  borderLeft: `4px solid ${accentColor}`,
                                  backgroundColor: isMe 
                                    ? 'var(--brand-tint)' 
                                    : 'var(--card)',
                                  padding: '6px 12px',
                                  boxShadow: isMe ? 'var(--hover-shadow)' : 'none',
                                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: 'default',
                                  '&:hover': {
                                    transform: 'translateY(-1.5px)',
                                    borderColor: isMe ? 'var(--brand)' : accentColor,
                                    boxShadow: 'var(--small-card-shadow)',
                                  },
                                }}
                              >
                                <Typography
                                  className="body-small-semibold"
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontWeight: 700,
                                    fontSize: '13.5px',
                                    color: isMe ? 'var(--brand-deep)' : 'var(--ink)',
                                    letterSpacing: '0.1px'
                                  }}
                                >
                                  {name}
                                </Typography>
                                {ass.isResponsible && (
                                  <Chip
                                    label="Resp."
                                    size="small"
                                    sx={{
                                      height: '18px',
                                      fontSize: '9px',
                                      fontWeight: '800',
                                      backgroundColor: accentColor,
                                      color: 'var(--always-white)',
                                      px: '4px',
                                      ml: '4px',
                                      borderRadius: '4px'
                                    }}
                                  />
                                )}
                              </Box>
                            );
                          })}
                          {(!turn.assignments || turn.assignments.length === 0) && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: 'var(--radius-xl)',
                                border: '1px dashed var(--line)',
                                borderLeft: '4px dashed var(--grey-300)',
                                backgroundColor: 'rgba(var(--grey-100-base), 0.03)',
                                padding: '6px 12px',
                              }}
                            >
                              <Typography 
                                className="body-small-medium" 
                                color="var(--grey-350)" 
                                sx={{ 
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  letterSpacing: '0.2px'
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
                          color: isCancelled ? 'var(--grey-400)' : 'var(--grey-600)',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          mt: { mobile: '4px', laptop: '0px' },
                          lineHeight: '1.4'
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
