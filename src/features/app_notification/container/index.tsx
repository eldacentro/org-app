import { Box, Stack } from '@mui/material';
import { NotificationContainerType } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useContainer from './useContainer';
import Drawer from '@components/drawer';
import NotificationItem from '../notification_item';
import NoNotificationImg from '@assets/img/illustration_no_notifications.svg?component';
import Typography from '@components/typography';
import Button from '@components/button';

const NotificationContainer = ({
  onClose,
  open,
}: NotificationContainerType) => {
  const { t } = useAppTranslation();

  const { notifications, handleMarkAllAsRead } = useContainer();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasMarkableUnread = notifications.some((n) => n.enableRead && !n.read);

  return (
    <Drawer
      anchor="right"
      onClose={onClose}
      open={open}
      title={t('tr_notifications')}
      disableContentScroll
      headActions={
        unreadCount > 0 || hasMarkableUnread ? (
          <Stack direction="row" alignItems="center" spacing="8px" sx={{ mr: '4px' }}>
            {hasMarkableUnread && (
              <Button
                variant="tertiary"
                onClick={handleMarkAllAsRead}
                sx={{ fontSize: '12px', height: '28px', minHeight: '28px', px: '10px' }}
              >
                Marcar todas como leídas
              </Button>
            )}
            {unreadCount > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '22px',
                  height: '22px',
                  borderRadius: 'var(--radius-max)',
                  backgroundColor: 'var(--accent-main)',
                  px: '6px',
                }}
              >
                <Typography
                  className="label-small-medium"
                  sx={{ color: 'white', fontSize: '11px', fontWeight: 700 }}
                >
                  {unreadCount}
                </Typography>
              </Box>
            )}
          </Stack>
        ) : undefined
      }
    >
      <Box
        sx={{
          height: '100%',
          overflow: 'auto',
          overscrollBehavior: 'contain',
          '&::-webkit-scrollbar': { width: '4px' },
        }}
      >
        {notifications.length === 0 && (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              pb: '40px',
            }}
          >
            <Box
              sx={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'var(--accent-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
              }}
            >
              <NoNotificationImg
                viewBox="0 0 128 128"
                style={{ width: '64px', height: '64px' }}
              />
            </Box>
            <Stack spacing="6px" alignItems="center" textAlign="center">
              <Typography className="h2" sx={{ fontWeight: 700 }}>
                {t('tr_noNotifications')}
              </Typography>
              <Typography
                sx={{ color: 'var(--grey-400)', maxWidth: '220px', lineHeight: 1.5 }}
              >
                {t('tr_noNotificationsDesc')}
              </Typography>
            </Stack>
          </Box>
        )}

        {notifications.length > 0 && (
          <Stack spacing={0} className="notif-list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};

export default NotificationContainer;
