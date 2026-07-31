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
      {/* La fila del mes es el botón, igual que su gemela del selector de
          reuniones: era un `Box` con `onClick` y los meses quedaban fuera del
          tabulador. */}
      <Box
        component="button"
        type="button"
        aria-expanded={expanded}
        sx={{
          width: '100%',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          appearance: 'none',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '-2px',
            borderRadius: 'var(--shape-xs)',
          },
        }}
        onClick={handleToggleExpand}
      >
        <Typography className="h4">{monthLabel}</Typography>
        <IconCollapse
          color="var(--black)"
          sx={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform var(--motion-medium) var(--ease-standard)',
          }}
        />
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
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
      </Collapse>
    </Box>
  );
};

export default DeptMonthItem;
