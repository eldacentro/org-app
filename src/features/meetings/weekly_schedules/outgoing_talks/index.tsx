import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { IconInfo } from '@components/icons';
import useOutgoingTalks from './useOutgoingTalks';
import WeekSelector from '../week_selector';
import WeekScheduleHeader from '../week_schedule_header';
import WeekContainer from './week_container';
import NoSchedule from '../no_schedule';
import Typography from '@components/typography';

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
      }}
    >
      <WeekSelector value={value} onChange={handleValueChange} />

      <WeekScheduleHeader
        currentVisible={currentWeekVisible}
        week={week}
        onCurrent={handleGoCurrent}
        lastUpdated={scheduleLastUpdated}
      />

      {week && (
        <Stack spacing="24px">
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
            <Typography
              align="center"
              color="var(--grey-400)"
              sx={{
                padding: '32px 16px',
                backgroundColor: 'var(--card)',
                border: '1px dashed var(--line)',
                borderRadius: 'var(--radius-l)',
              }}
            >
              {t('tr_noOutgoingTalksThisWeek', 'No hay discursos salientes programados para esta semana')}
            </Typography>
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
