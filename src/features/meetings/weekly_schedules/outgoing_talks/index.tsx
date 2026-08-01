import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { IconInfo, IconVisitingSpeaker } from '@components/icons';
import useOutgoingTalks from './useOutgoingTalks';
import WeekChipStrip from '../week_chip_strip';
import WeekScheduleHeader from '../week_schedule_header';
import WeekContainer from './week_container';
import NoSchedule from '../no_schedule';
import Typography from '@components/typography';
import EmptyState from '@components/empty_state';

const OutgoingTalks = () => {
  const { t } = useAppTranslation();
  const {
    value,
    handleValueChange,
    handleGoCurrent,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    talkSchedules,
  } = useOutgoingTalks();

  return noSchedule ? (
    <NoSchedule />
  ) : (
    <Box
      sx={{
        marginTop: '8px',
        // El mismo ritmo que las otras pestañas: 16px entre la tira de
        // semanas, la cabecera y el contenido. Aquí no había ninguno —el
        // `spacing` del `Stack` de abajo solo separa a SUS hijos entre sí— y
        // el contenido salía pegado al "Semana del 27 de julio al 2 de
        // agosto", sin nada de aire.
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <WeekChipStrip value={value} onChange={handleValueChange} />

      <WeekScheduleHeader
        currentVisible={currentWeekVisible}
        week={week}
        onCurrent={handleGoCurrent}
        lastUpdated={scheduleLastUpdated}
      />

      {week && (
        <Stack spacing="16px">
          {talkSchedules.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--grey-350)',
                marginTop: '-8px',
                marginBottom: '-8px',
              }}
            >
              <IconInfo color="var(--grey-350)" />
              <Typography color="var(--grey-350)">
                {t('tr_infoOutgoingTalk')}
              </Typography>
            </Box>
          )}

          {talkSchedules.length === 0 ? (
            // El estado vacío compartido. Este era una caja de borde PUNTEADO
            // hecha a mano, que se quedó fuera de la unificación de estados
            // vacíos: el punteado significa "aquí se suelta algo", y aquí no
            // se suelta nada.
            <EmptyState
              icon={<IconVisitingSpeaker color="var(--accent-dark)" />}
              title={t(
                'tr_noOutgoingTalksThisWeek',
                'No hay discursos salientes programados para esta semana'
              )}
            />
          ) : (
            talkSchedules.map((item) => (
              <WeekContainer key={item.date} talkSchedules={item} />
            ))
          )}
        </Stack>
      )}
    </Box>
  );
};

export default OutgoingTalks;
