import { Box } from '@mui/material';
import { useAtom } from 'jotai';
import { selectedDeptWeekState } from '@states/departments_schedule';
import Typography from '@components/typography';

const DeptWeekItem = ({ weekOf, label }: { weekOf: string; label: string }) => {
  const [selectedWeek, setSelectedWeek] = useAtom(selectedDeptWeekState);
  const isSelected = selectedWeek === weekOf;

  return (
    <Box
      sx={{
        cursor: 'pointer',
        padding: '8px 8px 8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--accent-200)',
        backgroundColor: isSelected ? 'var(--accent-150)' : 'unset',
        '.MuiTypography-root': {
          color: isSelected ? 'var(--accent-dark)' : 'var(--black)',
        },
        '&:hover': {
          backgroundColor: 'var(--accent-150)',
          '.MuiTypography-root': {
            color: 'var(--accent-dark)',
          },
        },
      }}
      onClick={() => setSelectedWeek(weekOf)}
    >
      <Typography className={isSelected ? 'body-semibold' : 'body-regular'}>
        {label}
      </Typography>
    </Box>
  );
};

export default DeptWeekItem;
