import { handleDeleteDatabase } from '@services/app';
import { apiDeletePushToken } from '@services/api/user';
import { revokePushToken } from '@services/firebase/messaging';
import { currentAuthUser } from '@services/firebase/auth';
import { clearKeysSecurely } from '@services/secure_storage';
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

    // Forget device-saved encryption keys on EXPLICIT logout only (not on the
    // automatic 403/404 recoveries that also call handleDeleteDatabase). Read
    // the uid before sign-out clears it.
    try {
      const uid = currentAuthUser()?.uid;
      if (uid) await clearKeysSecurely(uid);
    } catch (error) {
      logger.error('app', `failed to clear saved keys on logout: ${error}`);
    }

    await handleDeleteDatabase();
  };

  return { handleLogout };
};

export default useLogoutConfirm;
