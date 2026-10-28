import { LogoutConfirmType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useLogoutConfirm from './useLogoutConfirm';
import Button from '@components/button';
import Dialog from '@components/dialog';
import DialogFooter from '@components/dialog_footer';
import IconLoading from '@components/icon_loading';
import Typography from '@components/typography';

const LogoutConfirm = ({ open, onClose }: LogoutConfirmType) => {
  const { t } = useAppTranslation();

  const { handleLogout, cerrando } = useLogoutConfirm();

  return (
    // Mientras se cierra no se puede cerrar el diálogo: quedaría la operación
    // a medias por detrás y parecería que no ha pasado nada.
    <Dialog onClose={cerrando ? () => {} : onClose} open={open}>
      <Typography className="h2">{t('tr_logoutClearData')}</Typography>
      <Typography className="body-regular" color="var(--grey-400)">
        {cerrando
          ? 'Cerrando la sesión y dejando el dispositivo limpio. Tarda unos segundos; la app se volverá a abrir sola.'
          : t('tr_logoutClearDataDesc')}
      </Typography>
      <DialogFooter
        action={
          <Button
            variant="main"
            color="red"
            onClick={handleLogout}
            disabled={cerrando}
            startIcon={
              cerrando ? (
                <IconLoading width={20} color="var(--always-white)" />
              ) : undefined
            }
          >
            {cerrando ? 'Cerrando sesión…' : t('tr_logOut')}
          </Button>
        }
        cancel={
          <Button variant="tertiary" onClick={onClose} disabled={cerrando}>
            {t('tr_cancel')}
          </Button>
        }
      />
    </Dialog>
  );
};

export default LogoutConfirm;
