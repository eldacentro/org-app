import { Box } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { Typography } from '@components/index';
import ScrollableTabs from '@components/scrollable_tabs';
import useDeptWeekSelector from './useDeptWeekSelector';
import DeptMonthsContainer from './DeptMonthsContainer';

const DeptWeekSelector = () => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { yearsList, activeTab } = useDeptWeekSelector();

  const tabs = yearsList.map((year) => ({
    label: year.label,
    Component: <DeptMonthsContainer months={year.months} />,
  }));

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

      {tabs.length > 0 && <ScrollableTabs tabs={tabs} value={activeTab} />}
    </Box>
  );
};

export default DeptWeekSelector;
