import { useEffect, useState } from 'react';
import { User, getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  displaySnackNotification,
  setCurrentProvider,
} from '@services/states/app';
import { getTranslation } from '@services/i18n/translation';
import { dbAppSettingsSaveProfilePic } from '@services/dexie/settings';
import worker from '@services/worker/backupWorker';

const useFirebaseAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user: User) => {
      try {
        setUser(user);

        if (user) {
          worker.postMessage({
            field: 'idToken',
            value: await user.getIdToken(),
          });

          if (user.providerData.length > 1) {
            displaySnackNotification({
              header: getTranslation({ key: 'tr_errorTitle' }),
              message: getTranslation({
                key: 'oauthAccountExistsWithDifferentCredential',
              }),
              severity: 'error',
            });

            setIsAuthenticated(false);
            setLoading(false);
            return;
          }

          const provider = user.providerData[0]?.providerId || 'none';
          setCurrentProvider(provider);

          const photoURL = user.providerData[0]?.photoURL;
          dbAppSettingsSaveProfilePic(photoURL, provider);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isAuthenticated, user, loading };
};

export default useFirebaseAuth;
