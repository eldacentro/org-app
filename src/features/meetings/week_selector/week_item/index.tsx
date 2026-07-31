import { Box } from '@mui/material';
import { WeekItemType } from './index.types';
import useWeekItem from './useWeekItem';
import Typography from '@components/typography';
import ProgressBarSmall from '@components/progress_bar_small';
import WeekRow from '@components/period_selector/WeekRow';

const WeekItem = ({ week }: WeekItemType) => {
  const { weekDateLocale, handleSelectWeek, isSelected, assigned, total } =
    useWeekItem(week);

  return (
    <WeekRow
      label={weekDateLocale}
      selected={isSelected}
      onSelect={() => handleSelectWeek(week)}
      trailing={
        <Box sx={{ display: 'flex', alignItems: 'center', width: '144px' }}>
          <ProgressBarSmall value={assigned} maxValue={total} />
          <Typography
            className="label-small-medium"
            sx={{ width: '48px' }}
            textAlign="right"
          >
            {total > 0 && `${assigned}/${total}`}
          </Typography>
        </Box>
      }
    />
  );
};

export default WeekItem;
