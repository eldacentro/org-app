import { useState } from 'react';
import { Box } from '@mui/material';
import { useBreakpoints } from '@hooks/index';
import DeptMonthItem from './DeptMonthItem';

const DeptMonthsContainer = ({
  months,
}: {
  months: {
    label: string;
    value: string;
    weeks: { weekOf: string; label: string; noMeeting: boolean }[];
  }[];
}) => {
  const [currentExpanded, setCurrentExpanded] = useState('');
  const { tablet688Up } = useBreakpoints();

  return (
    <Box
      sx={{
        '& > .MuiBox-root': {
          borderBottom: '1px solid var(--line)',
        },
        '& > .MuiBox-root:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      {months.map((month) => (
        <DeptMonthItem
          key={month.value}
          monthLabel={month.label}
          monthValue={month.value}
          weeks={month.weeks}
          currentExpanded={currentExpanded}
          onChangeCurrentExpanded={(val) => setCurrentExpanded(val)}
          onWeekSelect={!tablet688Up ? () => {} : undefined}
        />
      ))}
    </Box>
  );
};

export default DeptMonthsContainer;
