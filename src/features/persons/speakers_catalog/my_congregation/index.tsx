import { Box, Collapse } from '@mui/material';
import useMyCongregation from './useMyCongregation';
import OutgoingSpeakersHeader from './header';
import ScrollableTabs from '@components/scrollable_tabs';

const MyCongregation = () => {
  const {
    handleToggleExpanded,
    isExpanded,
    handleToggleEdit,
    isEditMode,
    tabs,
  } = useMyCongregation();

  return (
    <Box
      sx={{
        flexGrow: 1,
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        padding: '16px',
        borderRadius: 'var(--r-lg)',
        width: '100%',
      }}
    >
      <OutgoingSpeakersHeader
        expanded={isExpanded}
        onExpandChange={handleToggleExpanded}
        editMode={isEditMode}
        onEditModeChange={handleToggleEdit}
      />

      <Collapse in={isExpanded} unmountOnExit>
        <Box
          sx={{
            borderTop: '1px solid var(--line)',
            marginTop: '16px',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <ScrollableTabs
            indicatorMode
            tabs={tabs}
            value={0}
            sx={{
              '& button.Mui-selected': {
                color: 'var(--accent-main)',
                background: 'unset',
                borderRadius: 'unset',
              },
              '& span.MuiTouchRipple-root': { borderRadius: 'var(--radius-l)' },
            }}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

export default MyCongregation;
