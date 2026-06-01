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

const ExhibitorsMeeting = ({ weekRecord }: { weekRecord?: ExhibitorWeekType }) => {
  const { t } = useAppTranslation();

  const settings = useAtomValue(exhibitorsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

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
    const turns = weekRecord?.turns || [];
    if (turns.length === 0) return [];

    const groups: Record<string, typeof turns> = {};

    for (const turn of turns) {
      if (!groups[turn.date]) {
        groups[turn.date] = [];
      }
      groups[turn.date].push(turn);
    }

    return Object.keys(groups)
      .sort()
      .map((date) => {
        const sortedTurns = groups[date].sort((a, b) => {
          const configA = settings?.turns?.find((t) => t.id === a.turnId);
          const configB = settings?.turns?.find((t) => t.id === b.turnId);
          const startA = configA?.startTime || '00:00';
          const startB = configB?.startTime || '00:00';
          return startA.localeCompare(startB);
        });

        // Parse date properly as a UTC date to avoid timezone shift
        const dateParts = date.split('/');
        const dayDate = new Date(+dateParts[0], +dateParts[1] - 1, +dateParts[2]);

        return {
          date,
          dayDate,
          turns: sortedTurns,
        };
      });
  }, [weekRecord, settings]);

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
      {groupedTurns.map(({ date, dayDate, turns }) => {
        const dayLabel = formatLegibleDate(dayDate);

        return (
          <Card
            key={date}
            sx={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Encabezado del día */}
            <Box
              sx={{
                px: '16px',
                py: '10px',
                backgroundColor: 'var(--accent-main)',
                borderBottom: 'none',
              }}
            >
              <Typography
                className="h2-caps"
                sx={{ 
                  fontWeight: '700', 
                  color: 'var(--always-white)', 
                  letterSpacing: '0.5px' 
                }}
              >
                {dayLabel}
              </Typography>
            </Box>

            {/* Lista de turnos */}
            <Stack sx={{ backgroundColor: 'var(--card)' }}>
              {turns.map((turn, idx) => {
                const turnConfig = settings?.turns?.find((t) => t.id === turn.turnId);
                const timeRange = turnConfig ? `${turnConfig.startTime} - ${turnConfig.endTime}` : 'Turno';
                const isAssignedToMe = turn.assignments?.some((a) => a.person === userUID);
                const isCancelled = turn.cancelled;

                return (
                  <Box
                    key={turn.turnId}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: '16px',
                      px: '16px',
                      py: '14px',
                      borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                      backgroundColor: isCancelled
                        ? '#fce8e6'
                        : isAssignedToMe
                        ? 'var(--accent-50, #f0f7ff)'
                        : 'var(--card)',
                    }}
                  >
                    {/* Hora */}
                    <Box sx={{ minWidth: '110px' }}>
                      <Typography
                        style={{
                          fontWeight: '700',
                          fontSize: '15px',
                          color: isCancelled ? 'var(--grey-500)' : 'var(--accent-main)',
                          textDecoration: isCancelled ? 'line-through' : 'none',
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
                        display: { xs: 'none', sm: 'block' },
                      }}
                    />

                    {/* Hermanos asignados */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {isCancelled ? (
                        <Chip
                          icon={<IconCancelFilled color="var(--error-main)" />}
                          label="Suspendido"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--error-150)',
                            color: 'var(--error-dark)',
                            fontWeight: '600',
                            alignSelf: 'flex-start',
                          }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {turn.assignments?.map((ass, aIdx) => {
                            const name = getBrotherDisplayName(ass.person);
                            if (!name) return null;
                            const isMe = ass.person === userUID;
                            return (
                              <Box 
                                key={aIdx} 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  borderRadius: 'var(--radius-s)',
                                  border: isMe 
                                    ? '1px solid var(--accent-main)' 
                                    : '1px solid transparent',
                                  backgroundColor: isMe 
                                    ? 'var(--accent-150)' 
                                    : 'var(--grey-50)',
                                  padding: '4px 8px',
                                  maxWidth: '220px',
                                }}
                              >
                                <Typography
                                  className="body-small-regular"
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontWeight: isMe ? 600 : 500,
                                    color: isMe ? 'var(--accent-dark)' : 'var(--black)',
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
                                      fontWeight: '700',
                                      backgroundColor: 'var(--accent-main)',
                                      color: 'var(--always-white)',
                                      px: '2px',
                                      ml: '2px'
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
                                borderRadius: 'var(--radius-s)',
                                border: '1px dashed var(--grey-300)',
                                backgroundColor: 'transparent',
                                padding: '4px 8px',
                              }}
                            >
                              <Typography className="body-small-regular" color="var(--grey-400)">
                                Sin asignar
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Lugar */}
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, minWidth: '150px' }}>
                      <Typography
                        style={{
                          fontSize: '13px',
                          color: isCancelled ? 'var(--grey-400)' : 'var(--grey-600)',
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
