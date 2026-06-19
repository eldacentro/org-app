import { User } from 'firebase/auth';
import { store } from '@states/index';
import {
  apiHostState,
  appLangState,
  isOnlineState,
  userIDState,
} from '@states/app';
import { congIDState, congRoleState, JWLangState } from '@states/settings';
import { currentAuthUser } from '@services/firebase/auth';

export const apiDefault = async (user?: User) => {
  const apiHost = store.get(apiHostState);
  const appVersion = '3.37.1';
  const appLang = store.get(appLangState);
  const congID = store.get(congIDState);
  const isOnline = store.get(isOnlineState);
  const JWLang = store.get(JWLangState);
  const userID = store.get(userIDState);
  const roles = store.get(congRoleState);

  const authUser = user || currentAuthUser();
  const userUID = authUser?.uid;
  const idToken = authUser ? await authUser.getIdToken() : undefined;

  return {
    apiHost,
    appVersion,
    userUID,
    appLang,
    congID,
    isOnline,
    JWLang,
    userID,
    idToken,
    roles,
  };
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  let res = await fetch(input, init);
  
  if (res.status === 401) {
    const authUser = currentAuthUser();
    if (authUser) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await authUser.getIdToken(true);
          isRefreshing = false;
          onTokenRefreshed(newToken);
        } catch (error) {
          isRefreshing = false;
          onTokenRefreshed('');
          console.error('Error refreshing token on 401:', error);
          return res;
        }
      }

      const newToken = await new Promise<string>((resolve) => {
        subscribeTokenRefresh((token) => resolve(token));
      });

      if (newToken) {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        const newInit = { ...init, headers };
        res = await fetch(input, newInit);
      }
    }
  }
  
  return res;
};
