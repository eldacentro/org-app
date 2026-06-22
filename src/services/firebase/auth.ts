import {
  AuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  browserLocalPersistence,
  setPersistence,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

export const userSignOut = async () => {
  const auth = await getAuth();
  if (auth) {
    await signOut(auth);
  }
};

export const currentAuthUser = () => {
  const auth = getAuth();
  const user = auth?.currentUser;
  return user;
};

export const setAuthPersistence = async () => {
  const auth = getAuth();

  await setPersistence(auth, browserLocalPersistence);
};

export const userSignInCustomToken = async (code: string) => {
  const auth = getAuth();
  const userCredential = await signInWithCustomToken(auth, code);

  return userCredential?.user;
};

export const userSignInPopup = async (provider: AuthProvider) => {
  const auth = getAuth();
  const result = await signInWithPopup(auth, provider);
  return result?.user;
};

// Solo se usa como respaldo cuando el popup ya falló (ver
// useAccountChooser) — navega la página entera a Google y vuelve, así que
// no le afecta lo que sí rompe al popup (bloqueo de cookies de terceros,
// la propia ventana de Google cerrándose si la vuelta tarda demasiado).
export const userSignInRedirect = async (provider: AuthProvider) => {
  const auth = getAuth();
  await signInWithRedirect(auth, provider);
};

export const authProvider = {
  GitHub: new GithubAuthProvider(),
  Google: new GoogleAuthProvider(),
  Microsoft: new OAuthProvider('microsoft.com').setCustomParameters({
    prompt: 'consent',
  }),
  Yahoo: new OAuthProvider('yahoo.com'),
};
