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
import { ServiceOutingWeekType } from '@definition/service_outings';
import { serviceOutingsSettingsState } from '@states/service_outings';
import { IconCancelFilled, IconInfo } from '@components/icons';
import { deriveWeekOutingSlots } from '@utils/service_outings';
import { isOutingsMonthPublished } from '@services/app/service_outings_publish';
import { useCurrentUser } from '@hooks/index';
import { monthNamesState } from '@states/app';
import { CANCELLED_ROW_BG } from '../shared_styles';

const ServiceOutingsMeeting = ({
  week,
  weekRecord,
  fromDate,
  showCoBanner = true,
}: {
  week: string;
  weekRecord?: ServiceOutingWeekType;
  /** Solo mostrar días desde esta fecha ("YYYY/MM/DD"). La página de la
   * Visita lo usa para empezar en miércoles (el programa del CO). */
  fromDate?: string;
  /** La página de la Visita lo oculta: allí es obvio de qué semana se trata. */
  showCoBanner?: boolean;
}) => {
  const { t } = useAppTranslation();

  const { isServiceCommittee } = useCurrentUser();

  const settings = useAtomValue(serviceOutingsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);
  const monthNames = useAtomValue(monthNamesState);

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

  // Derivación compartida (mismas reglas que el planificador y la agenda de
  // Próximos eventos): horas por mes de cada día, inhabilitados, suspensión
  // mensual con excepciones y turnos mié–dom forzados en la semana del CO.
  const generatedSlots = useMemo(() => {
    if (!week) return [];

    return deriveWeekOutingSlots(settings, weekRecord, week).map((slot) => {
      const [y, m, d] = slot.date.split('/').map(Number);
      return {
        ...slot,
        id: `${slot.date}_${slot.slotType}`,
        rawDate: new Date(y, m - 1, d),
      };
    });
  }, [week, weekRecord, settings]);

  const groupedOutings = useMemo(() => {
    if (generatedSlots.length === 0) return [];

    const groups: Record<string, typeof generatedSlots> = {};

    for (const slot of generatedSlots) {
      if (fromDate && slot.date < fromDate) continue;

      // Mes en BORRADOR: solo lo ve quien puede editarlo, y marcado como tal.
      // Lo que autocompletar propone no es una decisión hasta que el
      // responsable publica el mes. Se mira el mes de CADA día, no el de la
      // semana: una semana puede empezar en un mes y acabar en otro.
      if (
        !isOutingsMonthPublished(settings, slot.date) &&
        !isServiceCommittee
      ) {
        continue;
      }
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
  }, [generatedSlots, fromDate, settings, isServiceCommittee]);

  // Solo llega aquí quien puede editar: al resto se le han saltado los días de
  // un mes sin publicar.
  const draftMonths = useMemo(() => {
    const months = new Set<string>();

    for (const group of groupedOutings) {
      const month = group.date?.substring(0, 7);

      if (month && !isOutingsMonthPublished(settings, month)) months.add(month);
    }

    return [...months];
  }, [groupedOutings, settings]);

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
      {/* Solo llega aquí quien puede editar: al resto se le han saltado los
          días de un mes sin publicar. Se avisa para que no confunda un
          borrador con algo ya decidido. */}
      {draftMonths.length > 0 && (
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

      {showCoBanner && weekRecord?.isCircuitOverseerWeek && (
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
          <Typography
            className="body-regular"
            color="var(--accent-dark)"
            style={{ fontWeight: '700', margin: 0 }}
          >
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
                        ? CANCELLED_ROW_BG
                        : isAssignedToMe
                          ? 'var(--accent-150)'
                          : 'var(--card)',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Hora + Turno */}
                    <Box
                      sx={{
                        minWidth: { mobile: '0px', laptop: '90px' },
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        className="h4"
                        sx={{
                          fontWeight: '800',
                          color: isCancelled ? 'var(--grey-500)' : accentColor,
                          letterSpacing: '0.2px',
                        }}
                      >
                        {slot.time}
                      </Typography>
                      {turnLabel && (
                        <Typography
                          className="label-small-medium"
                          sx={{
                            color: 'var(--grey-500)',
                            fontWeight: '600',
                            letterSpacing: '0.1px',
                            marginTop: '2px',
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
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        minWidth: 0,
                        width: { mobile: '100%', laptop: 'auto' },
                      }}
                    >
                      {isCancelled ? (
                        <Chip
                          icon={<IconCancelFilled color="var(--error-main)" />}
                          label="Suspendida"
                          size="small"
                          sx={{
                            backgroundColor: 'var(--error-150)',
                            color: 'var(--error-dark)',
                            fontWeight: '700',
                          }}
                        />
                      ) : (
                        <AssigneeName
                          name={brotherName}
                          isMe={isAssignedToMe}
                          color={accentColor}
                          singleLine
                        />
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
                        className="body-small-semibold"
                        sx={{
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
                        {isCancelled ? '' : slot.location}
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
