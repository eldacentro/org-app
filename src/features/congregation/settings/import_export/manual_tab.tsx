import { Stack, Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Export from './export';
import Import from './import';
import Typography from '@components/typography';

const ManualTab = ({ onClose, onNext }: { onClose: () => void; onNext: () => void }) => {
  const { t } = useAppTranslation();

  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid item xs={12} md={6}>
        <Stack
          spacing={2}
          sx={{
            p: 3,
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-m)',
            bgcolor: 'var(--accent-50)',
            height: '100%',
          }}
        >
          <Typography className="h3" color="var(--accent-dark)">
            {t('tr_export')}
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            Descarga una copia de seguridad manual completa en un archivo JSON en tu dispositivo local.
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Export onClose={onClose} />
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <Stack
          spacing={2}
          sx={{
            p: 3,
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-m)',
            bgcolor: 'var(--accent-50)',
            height: '100%',
          }}
        >
          <Typography className="h3" color="var(--accent-dark)">
            {t('tr_import')}
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            Restaura o combina datos a partir de una copia de seguridad en formato JSON que hayas guardado previamente.
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Import onClose={onClose} onNext={onNext} />
        </Stack>
      </Grid>
    </Grid>
  );
};

export default ManualTab;
