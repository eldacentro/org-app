import { Box, Stack } from '@mui/material';
import {
  IconAccount,
  IconCheck,
  IconNotifications,
  IconPrepareReport,
  IconTalk,
  IconLocation,
} from '@components/icons';
import {
  JoinRequestNotificationType,
  NotificationRecordType,
  SpeakerNotificationType,
  UnverifiedReportNotificationType,
} from '@definition/notification';
import { useAppTranslation } from '@hooks/index';
import useNotificationItem from './useNotificationItem';
import Button from '@components/button';
import JoinRequest from '@features/congregation/app_access/join_requests/item';
import SpeakerAccessRequest from '../speakers_access_request';
import TerritoryAccessRequest from '../territory_access_request';
import TerritoryAssignedNotice from '../territory_assigned_notice';
import { TerritoryRequestNotificationType, TerritoryAssignedNotificationType } from '@definition/notification';
import TextMarkup from '@components/text_markup';
import Typography from '@components/typography';
import TabLabelWithBadge from '@components/tab_label_with_badge';

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  talk: {
    icon: <IconTalk color="var(--accent-main)" />,
    color: 'var(--accent-main)',
    bg: 'var(--accent-150)',
  },
  standard: {
    icon: <IconNotifications color="var(--brand)" />,
    color: 'var(--brand)',
    bg: 'var(--accent-200)',
  },
  reports: {
    icon: <IconPrepareReport color="#16a34a" />,
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.10)',
  },
  'territory-requests': {
    icon: <IconTalk color="var(--brand)" />,
    color: 'var(--brand)',
    bg: 'var(--accent-200)',
  },
  'join-requests': {
    icon: <IconAccount color="var(--orange-main)" />,
    color: 'var(--orange-main)',
    bg: 'rgba(234,88,12,0.10)',
  },
  'territory-assigned': {
    icon: <IconLocation color="var(--green-main)" />,
    color: 'var(--green-main)',
    bg: 'var(--green-secondary)',
  },
};

const NotificationItem = ({
  notification,
}: {
  notification: NotificationRecordType;
}) => {
  const { t } = useAppTranslation();

  const { itemDate, handleMarkAsRead, handleAnchorClick } =
    useNotificationItem(notification);

  const iconDef = ICON_MAP[notification.icon] ?? ICON_MAP['standard'];

  return (
    <Box
      className="notif-card"
      sx={{
        position: 'relative',
        borderRadius: '16px',
        p: '16px',
        mb: '12px',
        backgroundColor: notification.read ? 'var(--white)' : '#f8fafc',
        border: '1px solid',
        borderColor: notification.read ? 'var(--accent-200)' : 'var(--brand-main-10)',
        boxShadow: notification.read ? 'none' : '0 4px 12px rgba(0,0,0,0.03)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'default',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
          borderColor: 'var(--accent-300)',
        },
      }}
    >
      {/* Unread pulse dot */}
      {!notification.read && (
        <Box
          sx={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-main)',
            boxShadow: '0 0 0 2px var(--accent-main), 0 0 0 4px var(--accent-200)',
          }}
        />
      )}

      <Stack direction="row" spacing="12px" alignItems="flex-start">
        {/* Colored icon chip */}
        <Box
          sx={{
            flexShrink: 0,
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-m)',
            backgroundColor: iconDef.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {iconDef.icon}
        </Box>

        {/* Content */}
        <Stack spacing="6px" sx={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <Box sx={{ pr: '18px' }}>
            {notification.id !== 'reports-unverified' ? (
              <Typography className="h4" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {notification.title}
              </Typography>
            ) : (
              <TabLabelWithBadge
                className="h4"
                label={notification.title}
                badgeColor="var(--accent-main)"
                count={(notification as UnverifiedReportNotificationType).count}
              />
            )}
          </Box>

          {/* Description */}
          <TextMarkup
            content={notification.description}
            className="body-regular"
            color="var(--grey-400)"
            tagClassNames={{ strong: 'h4' }}
            anchorClassName="h4"
            anchorClick={handleAnchorClick}
          />

          {/* Nested content */}
          {notification.id === 'speakers-request' &&
            (notification as SpeakerNotificationType).congs.map((request) => (
              <SpeakerAccessRequest key={request.request_id} request={request} />
            ))}

                    {notification.id === 'territory-requests' &&
            (notification as TerritoryRequestNotificationType).requests.map((request) => (
              <TerritoryAccessRequest key={request.id} request={request} />
            ))}

          {notification.icon === 'territory-assigned' && (
            <TerritoryAssignedNotice notification={notification as TerritoryAssignedNotificationType} />
          )}

          {notification.id === 'join-requests' &&
            (notification as JoinRequestNotificationType).requests.map((request) => (
              <JoinRequest key={request.user} request={request} />
            ))}

          {/* Footer: mark as read + date */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={
              notification.enableRead && !notification.read ? 'space-between' : 'flex-end'
            }
            sx={{ pt: '4px' }}
          >
            {notification.enableRead && !notification.read && (
              <Button
                disableAutoStretch
                startIcon={<IconCheck />}
                variant="secondary"
                onClick={handleMarkAsRead}
                sx={{ fontSize: '12px', height: '28px', minHeight: '28px', px: '10px' }}
              >
                {t('tr_markAsRead')}
              </Button>
            )}
            <Typography
              sx={{
                color: 'var(--grey-350)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              {itemDate}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default NotificationItem;
