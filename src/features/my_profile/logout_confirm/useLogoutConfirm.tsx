import { handleDeleteDatabase } from '@services/app';
import { apiDeletePushToken } from '@services/api/user';
import { revokePushToken } from '@services/firebase/messaging';
import logger from '@services/logger/index';

const useLogoutConfirm = () => {
  const handleLogout = async () => {
    // Remove this device's FCM token while still authenticated (handleDeleteDatabase
    // signs the user out). Best-effort — never block logout on it.
    try {
      await apiDeletePushToken();
      await revokePushToken();
    } catch (error) {
      logger.error('push', `failed to clean up push token on logout: ${error}`);
    }

    await handleDeleteDatabase();
  };

  return { handleLogout };
};

export default useLogoutConfirm;
