import { useEffect, useState } from 'react';
import {
  User,
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  getRedirectResult,
} from 'firebase/auth';
import {
  displaySnackNotification,
  setCurrentProvider,
} from '@services/states/app';
import { getTranslation } from '@services/i18n/translation';
import { dbAppSettingsSaveProfilePic } from '@services/dexie/settings';
import worker from '@services/worker/backupWorker';

type AuthState = {
  isAuthenticated: boolean;
  user: User | undefined;
  loading: boolean;
};

// Single shared auth state for the whole app.
//
// This hook used to keep its own useState + onAuthStateChanged listener PER
// component. With several consumers (AccountChooser, VipStartup, ...) that meant
// multiple independent listeners AND multiple getRedirectResult() calls racing
// over the same pending redirect. On mobile that produced divergent
// isAuthenticated values between components and an unreliable redirect result.
// Now there is exactly one observer and one getRedirectResult call; every
// consumer reads the same state.
let authState: AuthState = {
  isAuthenticated: false,
  user: undefined,
  loading: true,
};

const listeners = new Set<() => void>();
let initialized = false;

const emit = () => listeners.forEach((listener) => listener());

const setAuthState = (patch: Partial<AuthState>) => {
  authState = { ...authState, ...patch };
  emit();
};

const initAuthOnce = () => {
  if (initialized) return;
  initialized = true;

  const auth = getAuth();

  const start = async () => {
    try {
      // Resolve any pending redirect ONCE for the whole app (crucial for mobile
      // login). Blocks `loading` from clearing before the redirect is processed.
      await getRedirectResult(auth);
    } catch (error) {
      console.error('Firebase redirect error:', error);
    }

    // Token fresco al sincronizador, SIEMPRE que Firebase lo renueve.
    //
    // `onAuthStateChanged` solo avisa cuando cambia el USUARIO (entrar, salir),
    // no cuando se renueva el token — y el token dura una hora. El worker de
    // sincronización no sabe pedirse uno por su cuenta: usa el que le manden.
    // Así que hasta ahora lo recibía al arrancar y luego solo si el temporizador
    // de cinco minutos corría (que exige la cuenta ya conectada) o DESPUÉS de
    // fallar. O sea: se enteraba de que su token estaba caducado fallando.
    //
    // `onIdTokenChanged` sí salta en cada renovación, unos cinco minutos antes
    // de que caduque. Con esto el worker nunca llega a usar uno vencido.
    onIdTokenChanged(auth, async (currentUser: User | null) => {
      if (!currentUser) return;

      try {
        worker.postMessage({
          field: 'idToken',
          value: await currentUser.getIdToken(),
        });
      } catch (error) {
        // Sin red no se puede refrescar; el ciclo de sync ya sabe recuperarse.
        console.error('Firebase token refresh error:', error);
      }
    });

    onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
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

            setAuthState({
              user: currentUser,
              isAuthenticated: false,
              loading: false,
            });
            return;
          }

          const provider = currentUser.providerData[0]?.providerId || 'none';
          setCurrentProvider(provider);

          const photoURL = currentUser.providerData[0]?.photoURL;
          dbAppSettingsSaveProfilePic(photoURL, provider);

          setAuthState({
            user: currentUser,
            isAuthenticated: true,
            loading: false,
          });
        } else {
          setAuthState({
            user: undefined,
            isAuthenticated: false,
            loading: false,
          });
        }
      } catch (error) {
        console.error(error);
        setAuthState({ loading: false });
      }
    });
  };

  start();
};

const useFirebaseAuth = (): AuthState => {
  const [, forceRender] = useState(0);

  useEffect(() => {
    initAuthOnce();

    const listener = () => forceRender((value) => value + 1);
    listeners.add(listener);

    // Sync immediately in case the shared state changed before we subscribed.
    listener();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return authState;
};

export default useFirebaseAuth;
