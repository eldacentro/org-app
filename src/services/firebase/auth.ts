import {
  AuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  getRedirectResult,
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

export const userSignInRedirect = async (provider: AuthProvider) => {
  const auth = getAuth();
  await signInWithRedirect(auth, provider);
};

export const getAuthRedirectResult = async () => {
  const auth = getAuth();
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
};

export const authProvider = {
  GitHub: new GithubAuthProvider(),
  Google: new GoogleAuthProvider(),
  Microsoft: new OAuthProvider('microsoft.com').setCustomParameters({
    prompt: 'consent',
  }),
  Yahoo: new OAuthProvider('yahoo.com'),
};
