import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { TrashEntry } from '@services/app/persons_trash';
import Button from '@components/button';
import Dialog from '@components/dialog';
import DialogFooter from '@components/dialog_footer';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';

/**
 * «¿Devolver a esta persona?»
 *
 * Dice exactamente QUÉ vuelve —la persona y cuántos informes suyos— porque es
 * lo que se viene a comprobar, y avisa de lo único que puede salir distinto de
 * lo esperado: que la norma de conservación se lleve parte de esos informes en
 * la comprobación del día siguiente. Una papelera que devuelve unos datos y se
 * los come sin avisar sería peor que no tenerla.
 */
const RestorePersonDialog = ({
  open,
  name,
  entry,
  reportsAtRisk,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  entry: TrashEntry;
  reportsAtRisk: number;
  onClose: VoidFunction;
  onConfirm: VoidFunction;
}) => {
  const { t } = useAppTranslation();

  const totalReports = entry.reportsAlive + entry.reportsDeleted;

  return (
    <Dialog onClose={onClose} open={open} sx={{ padding: '24px' }}>
      <Typography className="h2">{t('tr_restorePerson')}</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography className="body-regular" color="var(--ink-2)">
          {/* El singular se elige aquí y no con los plurales de i18next: el
              idioma de la app es 'spa', que no es un código que las reglas de
              plural sepan resolver. */}
          {totalReports === 0 && t('tr_restorePersonConfirmation', { name })}
          {totalReports === 1 &&
            t('tr_restorePersonConfirmationWithReportsOne', { name })}
          {totalReports > 1 &&
            t('tr_restorePersonConfirmationWithReports', {
              name,
              count: totalReports,
            })}
        </Typography>

        {reportsAtRisk > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={
              reportsAtRisk === 1
                ? t('tr_restorePersonRetentionWarningOne')
                : t('tr_restorePersonRetentionWarning', {
                    count: reportsAtRisk,
                  })
            }
          />
        )}
      </Box>

      <DialogFooter
        action={
          <Button variant="main" onClick={onConfirm}>
            {t('tr_restore')}
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

export default RestorePersonDialog;
