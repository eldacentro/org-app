import { Box } from '@mui/material';
import Switch from '@components/switch';
import SwitcherContainer from '@components/switcher_container';
import Typography from '@components/typography';
import {
  ProfileItemContainer,
  SettingWithBorderContainer,
} from '../index.styles';
import { useAppTranslation } from '@hooks/index';
import useNotifications from './useNotifications';

const Notifications = () => {
  const { t } = useAppTranslation();

  const { enabled, busy, unavailable, handleToggle } = useNotifications();

  return (
    <ProfileItemContainer>
      <Typography className="h2">{t('tr_notificationPreferences')}</Typography>

      <SettingWithBorderContainer>
        <SwitcherContainer>
          <Switch
            checked={enabled}
            disabled={unavailable || busy}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Typography>{t('tr_notifications')}</Typography>
            <Typography className="label-small-regular" color="var(--grey-350)">
              {t('tr_myAssignmentsDesc')}
            </Typography>
          </Box>
        </SwitcherContainer>

        {unavailable && (
          <Typography className="label-small-regular" color="var(--grey-350)">
            {t('tr_notificationPreferencesDesc')}
          </Typography>
        )}
      </SettingWithBorderContainer>
    </ProfileItemContainer>
  );
};

export default Notifications;

