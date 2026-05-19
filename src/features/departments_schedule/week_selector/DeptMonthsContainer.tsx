import { useState } from 'react';
import { Box } from '@mui/material';
import DeptMonthItem from './DeptMonthItem';

const DeptMonthsContainer = ({
  months,
}: {
  months: {
    label: string;
    value: string;
    weeks: { weekOf: string; label: string }[];
  }[];
}) => {
  const [currentExpanded, setCurrentExpanded] = useState('');

  return (
    <Box
      sx={{
        '& > .MuiBox-root': {
          borderBottom: '1px solid var(--accent-200)',
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
        />
      ))}
    </Box>
  );
};

export default DeptMonthsContainer;
