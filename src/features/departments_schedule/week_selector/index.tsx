import { Box, Button } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { Typography } from '@components/index';
import ScrollableTabs from '@components/scrollable_tabs';
import useDeptWeekSelector from './useDeptWeekSelector';

const DeptWeekSelector = () => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { weeksList, selectedWeek, setSelectedWeek, activeTab } =
    useDeptWeekSelector();

  const activeMonthWeeks = weeksList[activeTab]?.weeks || [];

  return (
    <Box
      sx={{
        width: desktopUp ? '360px' : '100%',
        flexShrink: 0,
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--accent-300)',
        backgroundColor: 'var(--white)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: desktopUp ? 'sticky' : 'unset',
        top: desktopUp ? 57 : 'unset',
      }}
    >
      <Typography className="h2">{t('tr_weeks', 'Semanas')}</Typography>

      {weeksList.length > 0 && (
        <ScrollableTabs tabs={weeksList} value={activeTab} />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeMonthWeeks.map((week) => (
          <Button
            key={week.weekOf}
            variant="text"
            onClick={() => setSelectedWeek(week.weekOf)}
            sx={{
              justifyContent: 'flex-start',
              padding: '8px 16px',
              borderRadius: 'var(--radius-l)',
              backgroundColor:
                selectedWeek === week.weekOf ? 'var(--accent-150)' : 'transparent',
              color:
                selectedWeek === week.weekOf
                  ? 'var(--accent-main)'
                  : 'var(--black)',
              '&:hover': {
                backgroundColor: 'var(--accent-100)',
              },
              textTransform: 'none',
            }}
          >
            <Typography
              className={
                selectedWeek === week.weekOf ? 'body-semibold' : 'body-regular'
              }
            >
              {week.label}
            </Typography>
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default DeptWeekSelector;
