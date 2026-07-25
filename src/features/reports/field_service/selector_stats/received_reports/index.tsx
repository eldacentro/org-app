import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useReceivedReports from './useReceivedReports';
import ProgressBar from '@components/progress_bar';
import Typography from '@components/typography';

const ReceivedReports = () => {
  const { t } = useAppTranslation();

  const { publishers_active, received_reports, unverified_reports } =
    useReceivedReports();

  return (
    <Stack spacing="8px">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <Typography className="h3">{t('tr_receivedReports')}</Typography>
        <Typography className="body-small-regular" color="var(--accent-400)">
          {t('tr_publishersCountReport', {
            publishersCount: publishers_active,
          })}
        </Typography>
      </Box>

      <ProgressBar value={received_reports} maxValue={publishers_active} />

      {/* El S-1 solo cuenta los informes verificados, así que un informe
          recibido y sin verificar no llega a la sucursal. Antes esto no se
          decía en ninguna parte. */}
      {unverified_reports > 0 && (
        <Typography className="body-small-regular" color="var(--orange-dark)">
          {unverified_reports === 1
            ? 'Hay 1 informe sin verificar: no contará en el S-1 hasta que lo verifiques.'
            : `Hay ${unverified_reports} informes sin verificar: no contarán en el S-1 hasta que los verifiques.`}
        </Typography>
      )}
    </Stack>
  );
};

export default ReceivedReports;
