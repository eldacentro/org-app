import { usePushNotifications } from '@hooks/index';
import { displaySnackNotification } from '@services/states/app';
import useAppTranslation from '@hooks/useAppTranslation';

/**
 * Account-settings notifications section (Phase 0).
 *
 * Wraps the push opt-in plumbing with user feedback. Enabling requests the
 * browser permission and registers the device's FCM token with the backend;
 * disabling revokes it. The switch is unavailable when the browser can't do web
 * push (notably iOS unless the PWA is installed) or when the user has blocked
 * notifications at the browser level.
 */
const useNotifications = () => {
  const { t } = useAppTranslation();

  const { supported, permission, busy, enabled, enablePush, disablePush } =
    usePushNotifications();

  const blocked = permission === 'denied';
  const unavailable = !supported || blocked;

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const ok = await enablePush();

      if (ok) {
        displaySnackNotification({
          header: t('tr_notifications'),
          message: t('tr_myAssignmentsDesc'),
          severity: 'success',
        });
      } else {
        displaySnackNotification({
          header: t('tr_notifications'),
          message: t('tr_notificationPreferencesDesc'),
          severity: 'error',
        });
      }

      return;
    }

    await disablePush();
  };

  return { enabled, busy, unavailable, blocked, handleToggle };
};

export default useNotifications;
