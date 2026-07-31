import { Box, Collapse } from '@mui/material';
import MonthRow from '@components/period_selector/MonthRow';
import DeptWeekItem from './DeptWeekItem';

const DeptMonthItem = ({
  monthLabel,
  monthValue,
  weeks,
  currentExpanded,
  onChangeCurrentExpanded,
  onWeekSelect,
}: {
  monthLabel: string;
  monthValue: string;
  weeks: { weekOf: string; label: string; noMeeting: boolean }[];
  currentExpanded: string;
  onChangeCurrentExpanded: (value: string) => void;
  onWeekSelect?: () => void;
}) => {
  const expanded = currentExpanded === monthValue;

  const handleToggleExpand = () => {
    onChangeCurrentExpanded(expanded ? '' : monthValue);
  };

  return (
    <Box>
      <MonthRow
        label={monthLabel}
        expanded={expanded}
        onToggle={handleToggleExpand}
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{ pb: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}
        >
          {weeks.map((week) => (
            <DeptWeekItem
              key={week.weekOf}
              weekOf={week.weekOf}
              label={week.label}
              noMeeting={week.noMeeting}
              onWeekSelect={
                onWeekSelect ? () => onChangeCurrentExpanded('') : undefined
              }
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default DeptMonthItem;
