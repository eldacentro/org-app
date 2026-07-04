import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { dayNamesShortState } from '@states/app';
import { IconArrowDown } from '@components/icons';
import Typography from '@components/typography';
import useDayRow from './useDayRow';
import DayRowEditor from './DayRowEditor';
import { MonthDayCell } from '../../month_view/useMonthView';

const DayRow = ({ cell, locked }: { cell: MonthDayCell; locked: boolean }) => {
  const { t } = useAppTranslation();
  const dayNamesShort = useAtomValue(dayNamesShortState);

  const {
    expanded,
    handleToggleExpand,
    handleClose,
    hoursEnabled,
    summaryHours,
    summaryStudies,
    hasExistingReport,
  } = useDayRow(cell, locked);

  if (!cell.date) return null;

  const weekday = dayNamesShort[cell.date.getDay()];

  return (
    <Box
      sx={{
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--line)',
        backgroundColor: cell.isToday ? 'var(--brand-tint)' : 'var(--card)',
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={handleToggleExpand}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 14px',
          cursor: locked ? 'default' : 'pointer',
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

        {!locked && (
          <IconArrowDown
            color="var(--grey-350)"
            sx={{
              transition: 'transform 0.2s ease',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          />
        )}
      </Box>

      {expanded && (
        <Box sx={{ padding: '0 14px 14px' }}>
          <DayRowEditor dateStr={cell.dateStr} onSaved={handleClose} hasExistingReport={hasExistingReport} />
        </Box>
      )}
    </Box>
  );
};

export default DayRow;
