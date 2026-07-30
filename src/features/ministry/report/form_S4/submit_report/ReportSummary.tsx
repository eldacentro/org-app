import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useFormS4 from '../useFormS4';
import useMinistryMonthlyRecord from '@features/ministry/hooks/useMinistryMonthlyRecord';
import Typography from '@components/typography';

/**
 * Resumen de lo que se va a enviar, dentro del propio diálogo de envío.
 *
 * Nace de un caso concreto: desde la vista de día solo se ve lo de ese día, y
 * si además hay crédito de horas no se distingue de las de predicación. Se
 * enviaba a ciegas. Ahora, en el último paso, se ve exactamente lo que sale.
 *
 * Cada línea aparece SOLO si aplica a esa persona: un publicador que no cuenta
 * horas no ve horas, y quien no tiene crédito no ve crédito. Ni más ni menos
 * de lo que le toca.
 */

const Row = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '16px',
    }}
  >
    <Typography className="body-regular" color="var(--grey-400)">
      {label}
    </Typography>
    <Typography className="body-regular-semibold" color="var(--black)">
      {value}
    </Typography>
  </Box>
);

const ReportSummary = ({
  month,
  person_uid,
}: {
  month: string;
  person_uid: string;
}) => {
  const { t } = useAppTranslation();

  const { isHourEnabled, hours_credit_enabled } = useFormS4({
    month,
    person_uid,
    publisher: true,
  });

  const { hours_fields, hours_credits, bible_studies, comments } =
    useMinistryMonthlyRecord({ month, person_uid, publisher: true });

  const creditHours = +hours_credits.split(':').at(0);

  return (
    <Stack
      spacing="6px"
      sx={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: 'var(--shape-sm)',
        border: '1px solid var(--accent-200)',
        backgroundColor: 'var(--accent-100)',
      }}
    >
      {isHourEnabled && (
        <Row label={t('tr_hours')} value={hours_fields.replace(':00', ' h')} />
      )}

      {isHourEnabled && hours_credit_enabled && creditHours > 0 && (
        <Row label={t('tr_creditHours')} value={`${creditHours} h`} />
      )}

      <Row label={t('tr_bibleStudies')} value={String(bible_studies)} />

      {comments?.length > 0 && (
        <Box sx={{ paddingTop: '4px' }}>
          <Typography className="body-small-regular" color="var(--grey-400)">
            {t('tr_comments')}
          </Typography>
          <Typography className="body-small-regular" color="var(--black)">
            {comments}
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default ReportSummary;
