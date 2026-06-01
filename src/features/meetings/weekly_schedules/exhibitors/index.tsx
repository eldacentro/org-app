import { Box, CircularProgress } from '@mui/material';
import WeekSelector from '../week_selector';
import useExhibitorsContainer from './useExhibitorsContainer';
import ExhibitorsMeeting from './ExhibitorsMeeting';

const ExhibitorsWeeklyContainer = () => {
  const {
    value,
    handleGoCurrent,
    handleValueChange,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    weekRecord,
    filteredSources,
  } = useExhibitorsContainer();

  return (
    <Box sx={{ width: '100%' }}>
      <WeekSelector
        value={value}
        onChange={handleValueChange}
        currentWeekVisible={currentWeekVisible}
        onGoCurrent={handleGoCurrent}
        scheduleLastUpdated={scheduleLastUpdated}
        customWeeksList={filteredSources}
      />

      {week === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : noSchedule ? (
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
          <Typography sx={{ color: 'var(--grey-400)', fontSize: '14px', fontWeight: '500' }}>
            No hay programa de exhibidores para esta semana.
          </Typography>
        </Box>
      ) : (
        <ExhibitorsMeeting weekRecord={weekRecord} />
      )}
    </Box>
  );
};

import Typography from '@components/typography';

export default ExhibitorsWeeklyContainer;
