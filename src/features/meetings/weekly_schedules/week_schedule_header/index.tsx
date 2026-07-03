import { Box } from '@mui/material';
import { useAtomValue } from 'jotai';
import { IconDate } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { WeekScheduleHeaderProps } from './index.types';
import useWeekScheduleHeader from './useWeekScheduleHeader';
import Typography from '@components/typography';
import { monthNamesState } from '@states/app';

const WeekScheduleHeader = (props: WeekScheduleHeaderProps) => {
  const { t } = useAppTranslation();
  const monthNames = useAtomValue(monthNamesState);

  const { showToCurrent } = useWeekScheduleHeader(props);

  // Antes esto tenía los nombres de mes y las 3 plantillas de frase en
  // español fijo, sin pasar por t() — invisible hoy porque la app está
  // forzada a español (FORCED_UI_LANG), pero rompería en cuanto eso cambie.
  const getWeekRangeLabel = (weekStr: string) => {
    if (!weekStr) return '';

    // Parse YYYY/MM/DD
    const parts = weekStr.split('/');
    if (parts.length !== 3) return weekStr;

    const monday = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayDay = monday.getDate();
    const mondayMonth = monthNames[monday.getMonth()];
    const mondayYear = monday.getFullYear();

    const sundayDay = sunday.getDate();
    const sundayMonth = monthNames[sunday.getMonth()];
    const sundayYear = sunday.getFullYear();

    if (monday.getMonth() === sunday.getMonth()) {
      return t('tr_weekRangeSameMonth', {
        mondayDay,
        sundayDay,
        month: mondayMonth,
        year: mondayYear,
      });
    } else if (monday.getFullYear() === sunday.getFullYear()) {
      return t('tr_weekRangeSameYear', {
        mondayDay,
        mondayMonth,
        sundayDay,
        sundayMonth,
        year: mondayYear,
      });
    } else {
      return t('tr_weekRangeDiffYear', {
        mondayDay,
        mondayMonth,
        mondayYear,
        sundayDay,
        sundayMonth,
        sundayYear,
      });
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
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '2px' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(var(--accent-main-base), 0.08)',
              border: '1px solid rgba(var(--accent-main-base), 0.15)',
              borderRadius: 'var(--radius-max)',
              padding: '5px 12px',
              boxShadow: '0 2px 8px rgba(var(--accent-main-base), 0.04)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              }
            }}
          >
            {/* Pulse indicator indicating fresh status */}
            <Box
              sx={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-main)',
                boxShadow: '0 0 0 0 rgba(var(--accent-main-base), 0.4)',
                animation: 'pulse-sync 2.2s infinite',
                '@keyframes pulse-sync': {
                  '0%': {
                    boxShadow: '0 0 0 0 rgba(var(--accent-main-base), 0.5)',
                  },
                  '70%': {
                    boxShadow: '0 0 0 5px rgba(var(--accent-main-base), 0)',
                  },
                  '100%': {
                    boxShadow: '0 0 0 0 rgba(var(--accent-main-base), 0)',
                  }
                }
              }}
            />
            
            <Typography
              className="label-small-medium"
              sx={{
                color: 'var(--accent-dark)',
                fontWeight: 600,
                fontSize: '12px',
                letterSpacing: '0.01em',
              }}
            >
              {t('tr_lastUpdated', { date: props.lastUpdated })}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default WeekScheduleHeader;
