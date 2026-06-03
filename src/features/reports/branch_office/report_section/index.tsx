import { Box, Stack } from '@mui/material';
import { IconGenerate, IconRegenerate } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import { ReportSectionProps } from './index.types';
import useReportSection from './useReportSection';
import Button from '@components/button';
import DateSelector from './date_selector';
import Divider from '@components/divider';
import ReportSelector from './report_selector';
import Typography from '@components/typography';

const ReportSection = ({
  report,
  onReportChange,
  month,
  onMonthChange,
  onYearChange,
  year,
}: ReportSectionProps) => {
  const { t } = useAppTranslation();

  const { laptopUp, tabletUp } = useBreakpoints();

  const { generated, submitted, handleGenerate } = useReportSection();

  return (
    <CardContainer sx={{ flex: 1 }}>
      <Stack spacing="24px" divider={<Divider color="var(--line)" />}>
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_reportDetails')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_branchOfficeReportDesc')}
          </Typography>
        </Stack>

        <Stack spacing="24px">
          <ReportSelector value={report} onChange={onReportChange} />

          <Box
            sx={{
              display: 'flex',
              alignItems: laptopUp ? 'center' : 'strecth',
              gap: '16px',
              flexDirection: !tabletUp
                ? 'column'
                : laptopUp
                  ? 'row'
                  : report === 'S-10'
                    ? 'row '
                    : 'column',
            }}
          >
            <DateSelector
              report={report}
              year={year}
              onYearChange={onYearChange}
              month={month}
              onMonthChange={onMonthChange}
            />
            <Button
              variant="tertiary"
              disabled={submitted}
              onClick={handleGenerate}
              startIcon={!generated ? <IconRegenerate /> : <IconGenerate />}
              sx={{ flex: report === 'S-1' ? 0.7 : 1 }}
            >
              {generated ? t('tr_regenerate') : t('tr_generate')}
            </Button>
          </Box>
        </Stack>
      </Stack>
    </CardContainer>
  );
};

export default ReportSection;
