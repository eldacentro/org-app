import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Button from '@components/button';
import Dialog from '@components/dialog';
import DialogFooter from '@components/dialog_footer';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';

/**
 * «Borrar para siempre» a UNA persona.
 *
 * Lleva su propio diálogo y no el de confirmar genérico porque tiene que decir
 * el NOMBRE y cuántos informes se van con él: en una papelera con cien filas,
 * un «¿seguro?» sin nombre es exactamente la forma de borrar al que no era.
 */
const PurgePersonDialog = ({
  open,
  name,
  reportCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  reportCount: number;
  onClose: VoidFunction;
  onConfirm: VoidFunction;
}) => {
  const { t } = useAppTranslation();

  return (
    <Dialog onClose={onClose} open={open} sx={{ padding: '24px' }}>
      <Typography className="h2">{t('tr_deleteForever')}</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography className="body-regular" color="var(--ink-2)">
          {reportCount === 0 && t('tr_purgePersonConfirmation', { name })}
          {reportCount === 1 && t('tr_purgePersonConfirmationOne', { name })}
          {reportCount > 1 &&
            t('tr_purgePersonConfirmationReports', {
              name,
              count: reportCount,
            })}
        </Typography>

        <InfoTip
          isBig={false}
          color="warning"
          text={t('tr_emptyTrashIrreversible')}
        />
      </Box>

      <DialogFooter
        action={
          <Button variant="main" color="red" onClick={onConfirm}>
            {t('tr_deleteForever')}
          </Button>
        }
        cancel={
          <Button variant="tertiary" onClick={onClose}>
            {t('tr_cancel')}
          </Button>
        }
      />
    </Dialog>
  );
};

export default PurgePersonDialog;
