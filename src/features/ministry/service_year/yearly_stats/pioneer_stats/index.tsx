import { Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { PioneerStatsProps } from './index.types';
import { monthShortNamesState } from '@states/app';
import usePioneerStats from './usePioneerStats';
import Divider from '@components/divider';
import LabelRow from '../label_row';
import Typography from '@components/typography';

const PioneerStats = ({ year }: PioneerStatsProps) => {
  const { t } = useAppTranslation();

  const monthShortNames = useAtomValue(monthShortNamesState);

  const {
    goal,
    hours_left,
    isCurrentSY,
    hours_balance,
    monthly_goal,
    last_reported_month,
  } = usePioneerStats(year);

  // '2026/06' -> 'jun 2026' con el nombre de mes del idioma activo
  const lastReportedLabel = (() => {
    if (!last_reported_month) return '';
    const [y, m] = last_reported_month.split('/');
    const name = monthShortNames[+m - 1] ?? m;
    return `${name} ${y}`;
  })();

  return (
    <Stack spacing="16px" padding="8px 0">
      <Typography className="h3">{t('tr_pioneerServiceStats')}</Typography>

      <Stack
        spacing="8px"
        divider={<Divider dashed color="var(--line)" />}
      >
        <LabelRow name={t('tr_goalForYear')} value={goal} />
        <LabelRow
          name={t('tr_hoursLeft')}
          value={hours_left}
          hint={isCurrentSY ? t('tr_hoursLeftHint') : undefined}
        />

        {isCurrentSY && (
          <LabelRow name={t('tr_currentMonthlyGoal')} value={monthly_goal} />
        )}

        {isCurrentSY && (
          <LabelRow
            name={t('tr_hoursBalance')}
            value={hours_balance}
            hint={
              lastReportedLabel
                ? t('tr_hoursBalanceHint', { month: lastReportedLabel })
                : undefined
            }
          />
        )}
      </Stack>
    </Stack>
  );
};

export default PioneerStats;
