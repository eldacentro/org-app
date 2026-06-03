import { Stack } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import useYearsStats from './useYearsStats';
import ScrollableTabs from '@components/scrollable_tabs';
import Typography from '@components/typography';

const YearsStats = () => {
  const { t } = useAppTranslation();

  const { tabletUp } = useBreakpoints();

  const { tabs, intial_value } = useYearsStats();

  return (
    <CardContainer sx={{ flex: 0.8 }}>
      <Stack spacing="16px">
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_serviceYear')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_serviceYearHistory')}
          </Typography>
        </Stack>

        <ScrollableTabs
          variant={tabletUp ? 'fullWidth' : 'scrollable'}
          tabs={tabs}
          value={intial_value}
        />
      </Stack>
    </CardContainer>
  );
};

export default YearsStats;
