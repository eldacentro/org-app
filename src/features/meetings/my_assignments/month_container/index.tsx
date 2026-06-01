import { Box, Stack } from '@mui/material';
import { AssignmentsMonthContainerProps } from './index.types';
import useMonthContainer from './useMonthContainer';
import AssignmentItem from '../assignment_item';
import Typography from '@components/typography';

const MonthContainer = ({ monthData }: AssignmentsMonthContainerProps) => {
  const { monthLocale } = useMonthContainer(monthData.month);

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          padding: '8px 12px',
          alignSelf: 'stretch',
          borderRadius: 'var(--r-sm)',
          background: 'var(--brand-tint)',
          borderLeft: '4px solid var(--brand)',
        }}
      >
        <Typography
          className="h2"
          color="var(--brand-deep)"
          sx={{ textAlign: 'left', fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          {monthLocale}
        </Typography>
      </Box>

      {monthData.children.map((history) => (
        <AssignmentItem key={history.id} history={history} />
      ))}
    </Stack>
  );
};

export default MonthContainer;
