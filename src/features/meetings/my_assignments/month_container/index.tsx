import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { AssignmentsMonthContainerProps } from './index.types';
import useMonthContainer from './useMonthContainer';
import AssignmentItem from '../assignment_item';
import Typography from '@components/typography';
import { AssignmentHistoryType } from '@definition/schedules';
import { getWeekDate, formatDate } from '@utils/date';

const MonthContainer = ({ monthData }: AssignmentsMonthContainerProps) => {
  const { monthLocale } = useMonthContainer(monthData.month);

  // Una asignación de "predicación" nunca debe compartir tarjeta con una de
  // "reuniones" aunque caigan el mismo día — son mundos distintos para quien
  // las lee. Limpieza tampoco se mezcla con ninguna de las dos.
  const getCategory = (item: AssignmentHistoryType) => {
    const key = item.assignment.key ?? '';
    if (key.startsWith('OUTING_') || key.startsWith('EXHIBITOR_')) {
      return 'preaching';
    }
    if (key.startsWith('LIMPIEZA_')) {
      return 'limpieza';
    }
    return 'meetings';
  };

  // Group assignments by their Monday weekOf
  const weekGroups = useMemo(() => {
    const grouped: Record<string, AssignmentHistoryType[]> = {};

    for (const item of monthData.children) {
      const dateParts = item.weekOf.split('/');
      let mondayKey = item.weekOf;
      if (dateParts.length === 3) {
        const itemDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
        const mondayDate = getWeekDate(itemDate);
        mondayKey = formatDate(mondayDate, 'yyyy/MM/dd');
      }

      if (!grouped[mondayKey]) grouped[mondayKey] = [];
      grouped[mondayKey].push(item);
    }

    // Dentro de cada semana, agrupamos por (día + categoría) para que varias
    // asignaciones del mismo día y mismo tipo (ej. presidente + lector de
    // entre semana) salgan en una sola tarjeta, sin mezclar predicación con
    // reuniones aunque coincida la fecha.
    return Object.keys(grouped)
      .sort()
      .map((weekOf) => {
        const dayGroups: Record<string, AssignmentHistoryType[]> = {};

        for (const item of grouped[weekOf]) {
          const dayKey = `${item.actualDate || item.weekOf}__${getCategory(item)}`;
          if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
          dayGroups[dayKey].push(item);
        }

        const items = Object.values(dayGroups)
          .map((group) =>
            group.toSorted((a, b) => a.id.localeCompare(b.id))
          )
          .toSorted(
            (a, b) =>
              (a[0].actualDate || a[0].weekOf).localeCompare(
                b[0].actualDate || b[0].weekOf
              )
          );

        return { weekOf, items };
      });
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
              {items.map((group) => (
                <AssignmentItem key={group[0].id} items={group} />
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default MonthContainer;
