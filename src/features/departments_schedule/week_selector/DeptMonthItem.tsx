import { Box, Collapse } from '@mui/material';
import { IconCollapse } from '@components/icons';
import Typography from '@components/typography';
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
  weeks: { weekOf: string; label: string }[];
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
      <Box
        sx={{
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={handleToggleExpand}
      >
        <Typography className="h4">{monthLabel}</Typography>
        <IconCollapse
          color="var(--black)"
          sx={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s',
          }}
        />
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {weeks.map((week) => (
          <DeptWeekItem
            key={week.weekOf}
            weekOf={week.weekOf}
            label={week.label}
            onWeekSelect={
              onWeekSelect ? () => onChangeCurrentExpanded('') : undefined
            }
          />
        ))}
      </Collapse>
    </Box>
  );
};

export default DeptMonthItem;
