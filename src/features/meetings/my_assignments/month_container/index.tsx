import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { AssignmentsMonthContainerProps } from './index.types';
import useMonthContainer from './useMonthContainer';
import AssignmentItem from '../assignment_item';
import Typography from '@components/typography';
import { AssignmentHistoryType } from '@definition/schedules';

const MonthContainer = ({ monthData }: AssignmentsMonthContainerProps) => {
  const { monthLocale } = useMonthContainer(monthData.month);

  // Group assignments by their weekOf (the Monday of their week)
  const weekGroups = useMemo(() => {
    const grouped: Record<string, AssignmentHistoryType[]> = {};

    for (const item of monthData.children) {
      const weekKey = item.weekOf;
      if (!grouped[weekKey]) grouped[weekKey] = [];
      grouped[weekKey].push(item);
    }

    // Sort weeks chronologically, then sort items within each week by actualDate or weekOf
    return Object.keys(grouped)
      .sort()
      .map((weekOf) => ({
        weekOf,
        items: grouped[weekOf].toSorted((a, b) =>
          (a.actualDate || a.weekOf).localeCompare(b.actualDate || b.weekOf)
        ),
      }));
  }, [monthData.children]);

  // Format the week label: "Semana del DD/MM" e.g. "2 jun"
  const formatWeekLabel = (weekOf: string) => {
    const parts = weekOf.split('/');
    if (parts.length < 3) return weekOf;
    const d = parseInt(parts[2], 10);
    const monthNames = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    const m = parseInt(parts[1], 10);
    return `Semana del ${d} de ${monthNames[m - 1]}`;
  };

  return (
    <Stack spacing="16px">
      {/* Month header */}
      <Box
        sx={{
          padding: '8px 14px',
          alignSelf: 'stretch',
          borderRadius: 'var(--r-sm)',
          background: 'var(--brand-tint)',
          borderLeft: '4px solid var(--brand)',
        }}
      >
        <Typography
          className="h2"
          color="var(--brand-deep)"
          sx={{
            textAlign: 'left',
            fontWeight: 800,
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {monthLocale}
        </Typography>
      </Box>

      {/* Week groups */}
      <Stack spacing="18px">
        {weekGroups.map(({ weekOf, items }) => (
          <Stack key={weekOf} spacing="8px">
            {/* Week label */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                px: '2px',
              }}
            >
              {/* Decorative line before */}
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: 'var(--line)',
                  borderRadius: '2px',
                }}
              />
              <Typography
                sx={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: 'var(--grey-400)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {formatWeekLabel(weekOf)}
              </Typography>
              {/* Decorative line after */}
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  background: 'var(--line)',
                  borderRadius: '2px',
                }}
              />
            </Box>

            {/* Items in this week */}
            <Stack spacing="8px">
              {items.map((history) => (
                <AssignmentItem key={history.id} history={history} />
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default MonthContainer;
