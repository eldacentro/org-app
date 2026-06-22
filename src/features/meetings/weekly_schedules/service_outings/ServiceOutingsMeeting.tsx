import { useMemo } from 'react';
import { Box, Card, Stack, Chip } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import Typography from '@components/typography';
import { personsStateFind } from '@services/states/persons';
import { displayNameMeetingsEnableState, fullnameOptionState, userLocalUIDState } from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { ServiceOutingWeekType } from '@definition/service_outings';
import { serviceOutingsSettingsState } from '@states/service_outings';
import { IconCancelFilled, IconInfo } from '@components/icons';
import { getEffectiveHoursForMonth, isOutingsMonthCancelled } from '@utils/service_outings';

const ServiceOutingsMeeting = ({ week, weekRecord }: { week: string; weekRecord?: ServiceOutingWeekType }) => {
  const { t } = useAppTranslation();

  const settings = useAtomValue(serviceOutingsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

  // Mes de esta semana (YYYY/MM) — para respetar "Ajustes del mes" (excepciones
  // de horario configuradas en Salidas de predicación, ej. verano).
  const weekMonthStr = useMemo(() => week?.slice(0, 7) || '', [week]);

  const monthCancelled = useMemo(() => {
    return isOutingsMonthCancelled(settings, weekMonthStr);
  }, [settings, weekMonthStr]);

  const defaultSettings = useMemo(() => {
    const effectiveHours = getEffectiveHoursForMonth(settings, weekMonthStr);

    return {
      defaultHours: effectiveHours,
      locations: settings?.locations || ['Salón del Reino'],
      disabledSlots: settings?.disabledSlots || [],
    };
  }, [settings, weekMonthStr]);

  const weekDays = useMemo(() => {
    if (!week) return [];
    const days = [];
    const parts = week.split('/');
    const monday = new Date(+parts[0], +parts[1] - 1, +parts[2]);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }, [week]);

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

  const generatedSlots = useMemo(() => {
    if (!week || weekDays.length === 0 || monthCancelled) return [];

    const defaultHours = defaultSettings.defaultHours || {};
    const disabledSlots = defaultSettings.disabledSlots || [];
    const outings = weekRecord?.outings || [];
    const overrideHours = weekRecord?.weekOverrideHours || {};

    const slots = [];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (let i = 0; i < 7; i++) {
      const date = weekDays[i];
      const dayLabel = dayKeys[i];
      const dbDateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

      // Morning Turn
      const morningType = `${dayLabel}_morning`;
      if (!disabledSlots.includes(morningType) && !disabledSlots.includes(dayLabel)) {
        const time = overrideHours[morningType] || defaultHours[morningType as keyof typeof defaultHours] || '10:00';
        const assigned = outings.find((o) => o.date === dbDateStr && o.time === time);

        slots.push({
          id: assigned?.id || crypto.randomUUID(),
          date: dbDateStr,
          rawDate: date,
          time,
          person: assigned?.person || '',
          location: assigned?.location || defaultSettings.locations?.[0] || 'Salón del Reino',
          cancelled: assigned?.cancelled || false,
          slotType: morningType,
        });
      }

      // Afternoon Turn
      const afternoonType = `${dayLabel}_afternoon`;
      if (!disabledSlots.includes(afternoonType) && !disabledSlots.includes(dayLabel)) {
        const time = overrideHours[afternoonType] || defaultHours[afternoonType as keyof typeof defaultHours] || '17:00';
        const assigned = outings.find((o) => o.date === dbDateStr && o.time === time);

        slots.push({
          id: assigned?.id || crypto.randomUUID(),
          date: dbDateStr,
          rawDate: date,
          time,
          person: assigned?.person || '',
          location: assigned?.location || defaultSettings.locations?.[0] || 'Salón del Reino',
          cancelled: assigned?.cancelled || false,
          slotType: afternoonType,
        });
      }
    }

    return slots;
  }, [week, weekDays, defaultSettings, weekRecord, monthCancelled]);

  const groupedOutings = useMemo(() => {
    if (generatedSlots.length === 0) return [];

    const groups: Record<string, typeof generatedSlots> = {};

    for (const slot of generatedSlots) {
      if (!groups[slot.date]) {
        groups[slot.date] = [];
      }
      groups[slot.date].push(slot);
    }

    return Object.keys(groups)
      .sort()
      .map((date) => ({
        date,
        dayDate: groups[date][0].rawDate,
        outings: groups[date],
      }));
  }, [generatedSlots]);

  const getSlotLabel = (slotType: string): string => {
    if (slotType.endsWith('_morning')) return 'Mañana';
    if (slotType.endsWith('_afternoon')) return 'Tarde';
    return '';
  };

  const getBrotherDisplayName = (personUid: string) => {
    if (!personUid) return '';
    if (personUid.startsWith('SHARED_CONG:')) {
      return personUid.replace('SHARED_CONG:', '');
    }
    if (personUid === 'CIRCUIT_OVERSEER') {
      return 'Superintendente de circuito';
    }
    const person = personsStateFind(personUid);
    if (!person) return '';
    return personGetDisplayName(person, displayNameEnabled, fullnameOption);
  };

  if (groupedOutings.length === 0) {
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
          No hay salidas de predicación programadas para esta semana.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing="16px" sx={{ mt: 1 }}>
      {weekRecord?.isCircuitOverseerWeek && (
        <Card
          sx={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-l)',
            backgroundColor: 'var(--accent-100)',
            px: '16px',
            py: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'none',
          }}
        >
          <Chip
            label="Semana del Superintendente"
            size="small"
            sx={{
              backgroundColor: 'var(--accent-main)',
              color: 'var(--always-white)',
              fontWeight: '700',
              fontSize: '11px',
            }}
          />
          <Typography className="body-regular" color="var(--accent-dark)" style={{ fontWeight: '700', margin: 0 }}>
            Semana de la visita del superintendente de circuito
          </Typography>
        </Card>
      )}
      {groupedOutings.map(({ date, dayDate, outings }) => {
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
                backgroundColor: 'var(--accent-main)',
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

            {/* Filas de salidas */}
            <Stack sx={{ backgroundColor: 'var(--card)' }}>
              {outings.map((slot, idx) => {
                const brotherName = getBrotherDisplayName(slot.person);
                const isAssignedToMe = slot.person === userUID;
                const isCancelled = slot.cancelled;
                const turnLabel = getSlotLabel(slot.slotType);
                const accentColor = 'var(--accent-main)';

                return (
                  <Box
                    key={slot.id}
                    sx={{
                      display: 'flex',
                      flexDirection: { mobile: 'column', laptop: 'row' },
                      alignItems: { mobile: 'stretch', laptop: 'center' },
                      gap: { mobile: '12px', laptop: '20px' },
                      px: '20px',
                      py: '18px',
                      borderTop: idx > 0 ? '1px solid var(--line)' : 'none',
                      backgroundColor: isCancelled
                        ? 'rgba(var(--red-main-base), 0.1)'
                        : isAssignedToMe
                        ? 'var(--accent-150)'
                        : 'var(--card)',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Hora + Turno */}
                    <Box sx={{ minWidth: { mobile: '0px', laptop: '90px' }, flexShrink: 0 }}>
                      <Typography
                        style={{
                          fontWeight: '800',
                          fontSize: '15px',
                          color: isCancelled ? 'var(--grey-500)' : accentColor,
                          letterSpacing: '0.2px'
                        }}
                      >
                        {slot.time}
                      </Typography>
                      {turnLabel && (
                        <Typography
                          style={{ 
                            fontSize: '12px', 
                            color: 'var(--grey-500)', 
                            fontWeight: '600',
                            letterSpacing: '0.1px',
                            marginTop: '2px'
                          }}
                        >
                          {turnLabel}
                        </Typography>
                      )}
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

                    {/* Hermano asignado */}
                    <Box sx={{ flex: 1, display: 'flex', minWidth: 0, width: { mobile: '100%', laptop: 'auto' } }}>
                      {isCancelled ? (
                        <Chip
                          icon={<IconCancelFilled color="var(--error-main)" />}
                          label="Suspendia"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--error-150)',
                            color: 'var(--error-dark)',
                            fontWeight: '700',
                          }}
                        />
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
                          {brotherName ? (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                borderRadius: 'var(--radius-xl)',
                                border: isAssignedToMe 
                                  ? '1.5px solid var(--accent-main)' 
                                  : '1px solid var(--line)',
                                borderLeft: `4px solid ${accentColor}`,
                                backgroundColor: isAssignedToMe 
                                  ? 'var(--accent-150)' 
                                  : 'var(--card)',
                                padding: '6px 12px',
                                boxShadow: isAssignedToMe ? 'var(--hover-shadow)' : 'none',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'default',
                                '&:hover': {
                                  transform: 'translateY(-1.5px)',
                                  borderColor: isAssignedToMe ? 'var(--accent-main)' : accentColor,
                                  boxShadow: 'var(--small-card-shadow)',
                                },
                              }}
                            >
                              <Typography
                                className="body-small-semibold"
                                sx={{
                                  minWidth: 0,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  fontWeight: 700,
                                  fontSize: '13.5px',
                                  color: isAssignedToMe ? 'var(--accent-dark)' : 'var(--ink)',
                                  letterSpacing: '0.1px'
                                }}
                              >
                                {brotherName}
                              </Typography>
                            </Box>
                          ) : (
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
                        alignSelf: { mobile: 'flex-start', laptop: 'center' }
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
                        {isCancelled ? '—' : slot.location}
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

export default ServiceOutingsMeeting;
