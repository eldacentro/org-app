import { ChangeEvent } from 'react';
import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { IconDelete } from '@components/icons';
import {
  ProfileItemContainer,
  SettingWithBorderContainer,
} from '../index.styles';
import useSecurity from './useSecurity';
import Divider from '@components/divider';
import MFAEnable from './mfaEnable';
import MFADisable from './mfaDisable';
import Button from '@components/button';
import SwitchWithLabel from '@components/switch_with_label';
import Typography from '@components/typography';
import DeleteAccount from './delete_account';

const Security = () => {
  const { t } = useAppTranslation();

  const {
    handleToggleMFA,
    isMFAEnabled,
    isOpenMFAEnable,
    handleCloseDialog,
    isOpenMFADisable,
    accountType,
    handleCloseDelete,
    handleOpenDelete,
    isAccountDelete,
  } = useSecurity();

  return (
    <ProfileItemContainer>
      {isOpenMFAEnable && (
        <MFAEnable open={isOpenMFAEnable} onClose={handleCloseDialog} />
      )}

      {isOpenMFADisable && (
        <MFADisable open={isOpenMFADisable} onClose={handleCloseDialog} />
      )}

      {isAccountDelete && (
        <DeleteAccount open={isAccountDelete} onClose={handleCloseDelete} />
      )}

      <Typography className="h2">{t('tr_security')}</Typography>

      <Stack spacing="16px" divider={<Divider color="var(--line)" />}>
        {accountType === 'vip' && (
          <SettingWithBorderContainer>
            <SwitchWithLabel
              label={t('tr_2FA')}
              helper={t('tr_2FADesc')}
              checked={isMFAEnabled}
              onChange={() =>
                handleToggleMFA({
                  preventDefault: () => undefined,
                } as unknown as ChangeEvent<HTMLInputElement>)
              }
            />
          </SettingWithBorderContainer>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            disableAutoStretch
            variant="small"
            color="red"
            onClick={handleOpenDelete}
            startIcon={<IconDelete />}
            sx={{ minHeight: '28px', height: '28px' }}
          >
            {t('tr_deleteAccount')}
          </Button>
        </Box>
      </Stack>
    </ProfileItemContainer>
  );
};

export default Security;
