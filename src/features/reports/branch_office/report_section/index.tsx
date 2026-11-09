import { Box, Stack } from '@mui/material';
import { IconGenerate, IconRegenerate } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import { ReportSectionProps } from './index.types';
import useReportSection from './useReportSection';
import Button from '@components/button';
import DateSelector from './date_selector';
import Divider from '@components/divider';
import InfoTip from '@components/info_tip';
import LateReports from './late_reports';
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

  const {
    generated,
    submitted,
    stale,
    handleGenerate,
    lateReports,
    unverifiedLate,
    handleMarkRecordOnly,
    handleVerifyLate,
  } = useReportSection();

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
              alignItems: laptopUp ? 'center' : 'stretch',
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

          {/* La foto guardada ya no cuadra con los datos: «Enviado» queda
              bloqueado hasta regenerar (ver `s1Differs`). */}
          {stale && (
            <InfoTip isBig={false} color="warning" text={t('tr_s1Stale')} />
          )}
        </Stack>

        {report === 'S-1' &&
          (lateReports.length > 0 || unverifiedLate.length > 0) && (
            <LateReports
              reports={lateReports}
              unverified={unverifiedLate}
              submitted={submitted}
              onRecordOnly={handleMarkRecordOnly}
              onVerify={handleVerifyLate}
            />
          )}
      </Stack>
    </CardContainer>
  );
};

export default ReportSection;
