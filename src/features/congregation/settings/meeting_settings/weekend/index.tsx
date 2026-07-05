import { Box } from '@mui/material';
import AssignmentPreferences from './assignment_preferences';
import DayTime from './day_time';
import MonthlyWarning from './monthly_warning';
import SpeakersEmail from './speakers_email';
import StudyConductor from './study_conductor';

const WeekendSettings = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <DayTime />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <AssignmentPreferences />

        <StudyConductor />

        <SpeakersEmail />

        <MonthlyWarning />
      </Box>
    </Box>
  );
};

export default WeekendSettings;
