import { Box, Stack } from '@mui/material';
import { IconInfo } from '@components/icons';
import { MonthlyReportProps } from './index.types';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '../../shared_styles';
import useMonthlyReport from './useMonthlyReport';
import Divider from '@components/divider';
import StatsRow from '@features/reports/stats_row';
import Typography from '@components/typography';

const MonthlyReport = (props: MonthlyReportProps) => {
  const { t } = useAppTranslation();

  const { monthname, generated, month_overview, field_reports } =
    useMonthlyReport(props);

  return (
    <Stack spacing="16px">
      <CardContainer>
        <Stack spacing="8px">
          <Typography className="h2">{monthname}</Typography>

          {!generated && (
            <Typography color="var(--grey-400)">
              <Box
                component="span"
                sx={{
                  verticalAlign: '-6px',
                  display: 'inline-flex',
                  marginRight: '4px',
                }}
              >
                <IconInfo color="var(--grey-400)" />
              </Box>
              {t('tr_branchOfficeReportMonthsDesc')}
            </Typography>
          )}
        </Stack>

        {generated && (
          <Stack spacing="4px" divider={<Divider color="var(--line)" />}>
            {month_overview.map((report) => (
              <StatsRow
                key={report.label}
                title={report.label}
                value={report.value}
              />
            ))}
          </Stack>
        )}
      </CardContainer>

      {generated && (
        <CardContainer>
          <Stack spacing="8px">
            <Typography className="h2">{t('tr_fieldService')}</Typography>
          </Stack>

          <Stack spacing="16px">
            {field_reports.map((section) => (
              <Stack
                key={section.section}
                spacing="4px"
                borderRadius="var(--radius-l)"
              >
                <Typography
                  className="h4"
                  color="var(--accent-dark)"
                  sx={{
                    borderRadius: 'var(--radius-s)',
                    padding: '4px 8px',
                    backgroundColor: 'var(--accent-150)',
                  }}
                >
                  {section.section}
                </Typography>

                <Stack divider={<Divider color="var(--line)" />}>
                  {section.reports.map((report) => (
                    <StatsRow
                      key={report.label}
                      title={report.label}
                      value={report.value}
                      sx={{ padding: '8px' }}
                    />
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </CardContainer>
      )}
    </Stack>
  );
};

export default MonthlyReport;
