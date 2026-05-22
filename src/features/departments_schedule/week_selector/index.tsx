import { Box, Collapse } from '@mui/material';
import { IconCollapse } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { Typography } from '@components/index';
import ScrollableTabs from '@components/scrollable_tabs';
import useDeptWeekSelector from './useDeptWeekSelector';
import DeptMonthsContainer from './DeptMonthsContainer';

const DeptWeekSelector = () => {
  const { t } = useAppTranslation();
  const {
    yearsList,
    activeTab,
    expanded,
    handleToggleExpand,
    desktopUp,
  } = useDeptWeekSelector();

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: desktopUp ? 'default' : 'pointer',
        }}
        onClick={desktopUp ? null : handleToggleExpand}
      >
        <Typography className="h2">{t('tr_weeks', 'Semanas')}</Typography>
        {!desktopUp && (
          <IconCollapse
            color="var(--black)"
            sx={{
              transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.3s',
            }}
          />
        )}
      </Box>

      <Collapse in={desktopUp || expanded} timeout="auto" unmountOnExit>
        {tabs.length > 0 && <ScrollableTabs tabs={tabs} value={activeTab} />}
      </Collapse>
    </Box>
  );
};

export default DeptWeekSelector;
