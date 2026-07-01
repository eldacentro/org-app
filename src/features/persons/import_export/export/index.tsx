import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { IconBackupOrganized, IconPrint } from '@components/icons';
import IconLoading from '@components/icon_loading';
import Button from '@components/button';
import Typography from '@components/typography';
import { useAppTranslation } from '@hooks/index';
import useExportPersons from './useExportPersons';
import useExportEmergencyContacts from './useExportEmergencyContacts';
import type { ExportType } from './index.types';

const Export = (props: ExportType) => {
  const { t } = useAppTranslation();

  const { fileName, isProcessing, handleExport } = useExportPersons();

  const {
    isProcessing: isProcessingEmergencyContacts,
    handleExport: handleExportEmergencyContacts,
  } = useExportEmergencyContacts();

  return (
    <Stack spacing="16px">
      <Stack
        spacing="16px"
        padding="16px"
        borderRadius="var(--radius-m)"
        bgcolor="var(--accent-150)"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconBackupOrganized color="var(--accent-dark)" />
          <Typography className="h4" color="var(--accent-dark)">
            {fileName}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing="8px">
        <Button
          variant="main"
          onClick={handleExport}
          endIcon={isProcessing && <IconLoading />}
        >
          {t('tr_download')}
        </Button>
      </Stack>

      <Divider />

      <Stack spacing="8px">
        <Button
          variant="secondary"
          startIcon={<IconPrint />}
          onClick={handleExportEmergencyContacts}
          endIcon={isProcessingEmergencyContacts && <IconLoading />}
        >
          Contactos de emergencia (PDF)
        </Button>
        <Button
          variant="secondary"
          disabled={isProcessing || isProcessingEmergencyContacts}
          onClick={props.onClose}
        >
          {t('tr_cancel')}
        </Button>
      </Stack>
    </Stack>
  );
};

export default Export;
