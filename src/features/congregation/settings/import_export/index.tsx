import { Box, Stack } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { ImportExportType } from './index.types';
import useImportExport from './useImportExport';
import ConfirmImport from './confirm_import';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Tabs from '@components/tabs';

const ImportExport = (props: ImportExportType) => {
  const { t } = useAppTranslation();
  const { isAdmin } = useCurrentUser();

  const { tabs, handleTabChange, value, state, handleOpenImportExport } =
    useImportExport(props);

  const getDescription = () => {
    if (isAdmin) {
      if (value === 0) return 'Exporta o importa manualmente el estado completo de la base de datos en archivos JSON.';
      if (value === 1) return 'Visualiza, descarga o restaura instantáneamente copias locales históricas y automáticas de este navegador.';
      if (value === 2) return 'Configura y vincula el guardado diario silencioso y automatizado en tu Google Drive.';
      return '';
    }
    return value === 0 ? t('tr_exportDesc') : t('tr_importDesc');
  };

  return (
    <Dialog onClose={props.onClose} open={props.open} sx={{ padding: '24px' }}>
      {state === 'import/export' && (
        <Stack spacing="16px">
          <Typography className="h2">{t('tr_importExportTitle')}</Typography>

          <Typography color="var(--grey-400)">
            {getDescription()}
          </Typography>

          <Box sx={{ marginBottom: '-24px !important' }}>
            <Tabs tabs={tabs} onChange={handleTabChange} value={value} />
          </Box>
        </Stack>
      )}

      {state === 'import/confirm' && (
        <ConfirmImport
          onBack={handleOpenImportExport}
          onClose={props.onClose}
        />
      )}
    </Dialog>
  );
};

export default ImportExport;
