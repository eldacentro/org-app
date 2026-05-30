import { Box } from '@mui/material';
import { IconDate } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { WeekScheduleHeaderProps } from './index.types';
import useWeekScheduleHeader from './useWeekScheduleHeader';
import Badge from '@components/badge';
import Typography from '@components/typography';

const WeekScheduleHeader = (props: WeekScheduleHeaderProps) => {
  const { t } = useAppTranslation();

  const { showToCurrent } = useWeekScheduleHeader(props);

  const getWeekRangeLabel = (weekStr: string) => {
    if (!weekStr) return '';
    
    // Parse YYYY/MM/DD
    const parts = weekStr.split('/');
    if (parts.length !== 3) return weekStr;
    
    const monday = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const mondayDay = monday.getDate();
    const mondayMonth = months[monday.getMonth()];
    const mondayYear = monday.getFullYear();

    const sundayDay = sunday.getDate();
    const sundayMonth = months[sunday.getMonth()];
    const sundayYear = sunday.getFullYear();

    if (monday.getMonth() === sunday.getMonth()) {
      return `Semana del ${mondayDay} al ${sundayDay} de ${mondayMonth} de ${mondayYear}`;
    } else if (monday.getFullYear() === sunday.getFullYear()) {
      return `Semana del ${mondayDay} de ${mondayMonth} al ${sundayDay} de ${sundayMonth} de ${mondayYear}`;
    } else {
      return `Semana del ${mondayDay} de ${mondayMonth} de ${mondayYear} al ${sundayDay} de ${sundayMonth} de ${sundayYear}`;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
      }}
    >
      <Typography
        className="h2"
        color="var(--accent-dark)"
        sx={{
          textAlign: 'center',
          fontWeight: 'bold',
        }}
      >
        {getWeekRangeLabel(props.week)}
      </Typography>

      {showToCurrent && (
        <Box
          onClick={props.onCurrent}
          sx={{
            borderRadius: 'var(--radius-max)',
            backgroundColor: 'var(--accent-150)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            padding: '4px 8px',
            cursor: 'pointer',
            userSelect: 'none',
            height: 'fit-content',
            marginBottom: '4px',
          }}
        >
          <IconDate width={22} height={22} color="var(--accent-dark)" />
          <Typography
            className="body-small-semibold"
            color="var(--accent-dark)"
          >
            {t('tr_toCurrentWeek')}
          </Typography>
        </Box>
      )}

      {props.lastUpdated && (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Badge
            text={t('tr_lastUpdated', { date: props.lastUpdated })}
            color="grey"
            size="small"
            filled={false}
          />
        </Box>
      )}
    </Box>
  );
};

export default WeekScheduleHeader;
