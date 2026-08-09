import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Button from '@components/button';
import Dialog from '@components/dialog';
import DialogFooter from '@components/dialog_footer';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';

/**
 * «Vaciar la papelera» — lo único de toda la app que no se puede deshacer.
 *
 * Dice el número de personas y el de informes ANTES de preguntar, porque
 * «vaciar la papelera» no informa de nada por sí solo: doce personas y ciento
 * y pico informes no es la misma decisión que dos y ninguno.
 */
const EmptyTrashDialog = ({
  open,
  personCount,
  reportCount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  personCount: number;
  reportCount: number;
  onClose: VoidFunction;
  onConfirm: VoidFunction;
}) => {
  const { t } = useAppTranslation();

  return (
    <Dialog onClose={onClose} open={open} sx={{ padding: '24px' }}>
      <Typography className="h2">{t('tr_emptyTrash')}</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography className="body-regular" color="var(--ink-2)">
          {personCount === 1
            ? t('tr_emptyTrashConfirmationOne')
            : t('tr_emptyTrashConfirmation', { count: personCount })}
        </Typography>

        {reportCount > 0 && (
          <Typography className="body-regular" color="var(--ink-2)">
            {reportCount === 1
              ? t('tr_emptyTrashReportsOne')
              : t('tr_emptyTrashReports', { count: reportCount })}
          </Typography>
        )}

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

export default EmptyTrashDialog;
