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

const ServiceOutingsMeeting = ({ week, weekRecord }: { week: string; weekRecord?: ServiceOutingWeekType }) => {
  const { t } = useAppTranslation();

  const settings = useAtomValue(serviceOutingsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);

  const defaultSettings = useMemo(() => {
    return settings || {
      defaultHours: {
        monday_morning: '10:00',
        monday_afternoon: '17:00',
        tuesday_morning: '10:00',
        tuesday_afternoon: '17:00',
        wednesday_morning: '10:00',
        wednesday_afternoon: '17:00',
        thursday_morning: '10:00',
        thursday_afternoon: '17:00',
        friday_morning: '10:00',
        friday_afternoon: '17:30',
        saturday_morning: '09:45',
        saturday_afternoon: '17:00',
        sunday_morning: '10:30',
        sunday_afternoon: '17:00',
      },
      locations: ['Salón del Reino'],
      disabledSlots: [],
    };
  }, [settings]);

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
    if (!week || weekDays.length === 0) return [];

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
  }, [week, weekDays, defaultSettings, weekRecord]);

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

            {/* Filas de salidas */}
            <Stack sx={{ backgroundColor: 'var(--card)' }}>
              {outings.map((slot, idx) => {
                const brotherName = getBrotherDisplayName(slot.person);
                const isAssignedToMe = slot.person === userUID;
                const isCancelled = slot.cancelled;
                const turnLabel = getSlotLabel(slot.slotType);

                return (
                  <Box
                    key={slot.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
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
                    {/* Hora + Turno */}
                    <Box sx={{ minWidth: '80px' }}>
                      <Typography
                        style={{
                          fontWeight: '700',
                          fontSize: '15px',
                          color: isCancelled ? 'var(--grey-500)' : 'var(--accent-main)',
                        }}
                      >
                        {slot.time}
                      </Typography>
                      {turnLabel && (
                        <Typography
                          style={{ fontSize: '12px', color: 'var(--grey-500)', fontWeight: '500' }}
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
                      }}
                    />

                    {/* Hermano asignado */}
                    <Box sx={{ flex: 1 }}>
                      {isCancelled ? (
                        <Chip
                          icon={<IconCancelFilled color="var(--error-main)" />}
                          label="Suspendida"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--error-150)',
                            color: 'var(--error-dark)',
                            fontWeight: '600',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'center',
                            borderRadius: 'var(--radius-s)',
                            border: isAssignedToMe 
                              ? '1px solid var(--accent-main)' 
                              : brotherName ? '1px solid transparent' : '1px dashed var(--grey-300)',
                            backgroundColor: isAssignedToMe 
                              ? 'var(--accent-150)' 
                              : brotherName ? 'var(--grey-50)' : 'transparent',
                            padding: '4px 8px',
                            maxWidth: '220px',
                            overflow: 'hidden',
                          }}
                        >
                          <Typography
                            className="body-small-regular"
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: isAssignedToMe ? 600 : 500,
                              color: isAssignedToMe 
                                ? 'var(--accent-dark)' 
                                : brotherName ? 'var(--black)' : 'var(--grey-400)',
                            }}
                          >
                            {brotherName || 'Sin asignar'}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Lugar */}
                    <Box sx={{ textAlign: 'right', minWidth: '120px' }}>
                      <Typography
                        style={{
                          fontSize: '13px',
                          color: isCancelled ? 'var(--grey-400)' : 'var(--grey-600)',
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
