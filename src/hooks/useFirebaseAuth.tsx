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
import { conLimite } from '@utils/con_limite';

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

/**
 * Manda el token al sincronizador sin hacer esperar a nadie.
 *
 * El worker no sabe pedirse un token por su cuenta. Pero conseguirlo puede
 * tardar —o no volver—: si el que hay caducó, Firebase va a la red a por uno
 * nuevo, y en el iPhone, tras un rato en segundo plano, puede quedarse
 * atascado en su almacén. Por eso va siempre aparte y con tope.
 */
const mandarTokenAlWorker = (user: User) => {
  conLimite(user.getIdToken(), 15_000, 'token para el worker')
    .then((value) => worker.postMessage({ field: 'idToken', value }))
    // Sin red no se puede refrescar; el ciclo de sync ya sabe recuperarse.
    .catch((error) => console.error('Firebase token refresh error:', error));
};

const initAuthOnce = () => {
  if (initialized) return;
  initialized = true;

  const auth = getAuth();

  // RED DE SEGURIDAD DEL ARRANQUE. El arranque espera a que Firebase diga si
  // hay sesión (`loading`), y eso depende de leer su almacén. Si esa lectura
  // no vuelve, la app se quedaba en el cargador PARA SIEMPRE, y lo único que
  // lo arreglaba era borrar la app de la pantalla de inicio y volver a
  // instalarla. A los 10 s se deja de esperar con lo que se sepa: los datos
  // del dispositivo ya permiten abrir, y si luego Firebase contesta, el estado
  // se corrige solo.
  setTimeout(() => {
    if (!authState.loading) return;
    console.error('Firebase auth: sin respuesta en 10 s, se abre sin esperar');
    const user = auth.currentUser;
    setAuthState({
      user: user ?? undefined,
      isAuthenticated: Boolean(user),
      loading: false,
    });
  }, 10_000);

  const start = async () => {
    try {
      // Resolve any pending redirect ONCE for the whole app (crucial for mobile
      // login). Blocks `loading` from clearing before the redirect is processed.
      // Con tope: es una lectura del almacén, y ver arriba.
      await conLimite(getRedirectResult(auth), 8_000, 'getRedirectResult');
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
    onIdTokenChanged(auth, (currentUser: User | null) => {
      if (!currentUser) return;
      mandarTokenAlWorker(currentUser);
    });

    onAuthStateChanged(auth, (currentUser: User | null) => {
      try {
        if (currentUser) {
          // ANTES aquí se ESPERABA al token antes de decir que había sesión.
          // Si al abrir la app el token había caducado y no había buena
          // cobertura —el iPhone recién despertado, saliendo del wifi—, pedirlo
          // fallaba, se saltaba al `catch` de abajo y la sesión quedaba como
          // «no hay» durante TODA la visita: sin validar la cuenta, sin
          // reconexión automática, con el icono en rojo y sin forma de salir de
          // ahí más que cerrando la app. Que haya sesión no depende del token:
          // el usuario ya está. El token va aparte y sin hacer esperar.
          mandarTokenAlWorker(currentUser);

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
