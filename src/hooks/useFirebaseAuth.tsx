import { useEffect, useState } from 'react';
import { User, getAuth, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
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
    let unsubscribe: () => void;

    const initAuth = async () => {
      try {
        // Await any pending redirect operations (crucial for mobile login)
        // This blocks the 'loading' state from becoming false prematurely
        await getRedirectResult(auth);
      } catch (error) {
        console.error('Firebase redirect error:', error);
      }

      unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
        try {
          setUser(currentUser || undefined);

          if (currentUser) {
            worker.postMessage({
              field: 'idToken',
              value: await currentUser.getIdToken(),
            });

            if (currentUser.providerData.length > 1) {
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

            const provider = currentUser.providerData[0]?.providerId || 'none';
            setCurrentProvider(provider);

            const photoURL = currentUser.providerData[0]?.photoURL;
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
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { isAuthenticated, user, loading };
};

export default useFirebaseAuth;
