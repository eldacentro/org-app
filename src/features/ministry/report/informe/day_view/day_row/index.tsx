import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { dayNamesShortState } from '@states/app';
import Typography from '@components/typography';
import useDayRow from './useDayRow';
import { MonthDayCell } from '../../month_view/useMonthView';

const DayRow = ({
  cell,
  onSelect,
}: {
  cell: MonthDayCell;
  onSelect: (dateStr: string) => void;
}) => {
  const { t } = useAppTranslation();
  const dayNamesShort = useAtomValue(dayNamesShortState);

  const { hoursEnabled, summaryHours, summaryStudies } = useDayRow(cell);

  if (!cell.date) return null;

  const weekday = dayNamesShort[cell.date.getDay()];

  return (
    <Box
      onClick={() => onSelect(cell.dateStr)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        cursor: 'pointer',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--line)',
        backgroundColor: cell.isToday ? 'var(--brand-tint)' : 'var(--card)',
      }}
    >
      <Box
        sx={{
          width: '38px',
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
        <Typography className="body-small-semibold" color="var(--grey-400)" sx={{ textTransform: 'uppercase' }}>
          {weekday}
        </Typography>
        <Typography className="h3" color={cell.isToday ? 'var(--brand-deep)' : 'var(--ink)'}>
          {cell.dayNum}
        </Typography>
      </Box>

      <Stack sx={{ flex: 1 }} spacing="2px">
        {hoursEnabled && (
          <Typography className="body-small-semibold">{summaryHours}</Typography>
        )}
        <Typography className="body-small-regular" color="var(--grey-400)">
          {summaryStudies > 0
            ? `${summaryStudies} ${t('tr_individualBibleStudies', 'cursos bíblicos')}`
            : t('tr_noStudiesShort', '—')}
        </Typography>
      </Stack>
    </Box>
  );
};

export default DayRow;
