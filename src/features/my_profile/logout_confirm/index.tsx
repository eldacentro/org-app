import { LogoutConfirmType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useLogoutConfirm from './useLogoutConfirm';
import Button from '@components/button';
import Dialog from '@components/dialog';
import DialogFooter from '@components/dialog_footer';
import Typography from '@components/typography';

const LogoutConfirm = ({ open, onClose }: LogoutConfirmType) => {
  const { t } = useAppTranslation();

  const { handleLogout } = useLogoutConfirm();

  return (
    <Dialog onClose={onClose} open={open}>
      <Typography className="h2">{t('tr_logoutClearData')}</Typography>
      <Typography className="body-regular" color="var(--grey-400)">
        {t('tr_logoutClearDataDesc')}
      </Typography>
      <DialogFooter
        action={
          <Button variant="main" color="red" onClick={handleLogout}>
            {t('tr_logOut')}
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

export default LogoutConfirm;
