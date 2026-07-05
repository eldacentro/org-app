import { Box, Stack } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import useSelectorStats from './useSelectorStats';
import Divider from '@components/divider';
import ReceivedReports from './received_reports';
import ServiceYearMonthSelector from '@features/reports/service_year_month_selector';
import PersonFilter from './person_filter';
import ReportStatusFilter from './report_status_filter';
import { IconInfo } from '@components/icons';
import Typography from '@components/typography';

const SelectorStats = () => {
  const { t } = useAppTranslation();

  const { desktopUp } = useBreakpoints();

  const { handleMonthChange, handleYearChange, month, year, month_locked } =
    useSelectorStats();

  return (
    <CardContainer>
      <Stack spacing="24px" divider={<Divider color="var(--line)" />}>
        <Stack spacing="24px">
          <Stack spacing="8px">
            <Typography className="h2">{t('tr_receivedReports')}</Typography>
            <Typography color="var(--grey-400)">
              {t('tr_reportPageInfo')}
            </Typography>
          </Stack>

          <ServiceYearMonthSelector
            year={year}
            month={month || ''}
            onYearChange={handleYearChange}
            onMonthChange={handleMonthChange}
          />

          {month_locked && (
            <Box
              sx={{
                borderRadius: 'var(--radius-xl)',
                padding: '16px',
                backgroundColor: 'var(--orange-secondary)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <IconInfo color="var(--orange-dark)" />
              <Typography color="var(--orange-dark)">
                {t('tr_alreadySubmittedWarning')}
              </Typography>
            </Box>
          )}
        </Stack>

        <Stack spacing="24px">
          <ReceivedReports />

          <Box
            sx={{
              display: 'flex',
              flexDirection: desktopUp ? 'row' : 'column',
              gap: '16px',
              '& > *': { flex: 1 },
            }}
          >
            <PersonFilter />
            <ReportStatusFilter />
          </Box>
        </Stack>
      </Stack>
    </CardContainer>
  );
};

export default SelectorStats;
