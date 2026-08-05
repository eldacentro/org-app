import {
  AuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
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

/**
 * Dónde guarda Firebase la sesión de este dispositivo.
 *
 * Esto pedía `browserLocalPersistence`, que es `localStorage`. Y `localStorage`
 * es el almacén MÁS frágil que hay: es lo primero que los navegadores tiran
 * cuando les aprieta el espacio, y en Safari entra de lleno en el borrado
 * automático a los pocos días sin usar el sitio. Perder ese hueco es perder la
 * sesión entera, y entonces no hay token que refrescar ni botón que valga.
 *
 * IndexedDB es bastante más duradero, sobrevive a las limpiezas que se llevan
 * `localStorage` por delante, y además es lo que el propio Firebase elige por
 * su cuenta cuando nadie le dice nada. Con respaldo al de antes por si el
 * navegador no lo permite (modo privado en algunos casos), porque una sesión en
 * un sitio frágil sigue siendo mejor que ninguna.
 */
export const setAuthPersistence = async () => {
  const auth = getAuth();

  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch (error) {
    console.error('IndexedDB persistence unavailable, using localStorage', error);
    await setPersistence(auth, browserLocalPersistence);
  }
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
