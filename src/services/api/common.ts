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

// Every API call in the app goes through this one function, and `fetch` has
// no built-in timeout — on a flaky connection (the normal case for someone
// out in the field), a request that never resolves left whatever screen
// called it stuck on "loading" forever, with no way out except reloading.
const REQUEST_TIMEOUT_MS = 20000;

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(
        'La solicitud tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// El servidor no responde 401 cuando el token de Firebase ha caducado o no
// decodifica: responde 403 con el mensaje LOGIN_FIRST (ver visitor_checker en
// sws2apps-api). Como aquí solo se reintentaba ante un 401, el refresco
// automático del token NO se activaba nunca en el caso más común — y ese 403
// acababa tratándose como "sesión revocada": cierre de sesión silencioso o
// cuenta desconectada. Se distingue por el mensaje: LOGIN_FIRST se arregla con
// un token nuevo; DEVICE_REVOKED / SESSION_REVOKED / ACCOUNT_NOT_FOUND no.
const isStaleTokenResponse = async (res: Response) => {
  if (res.status === 401) return true;
  if (res.status !== 403) return false;

  try {
    const data = await res.clone().json();
    return data?.message === 'LOGIN_FIRST';
  } catch {
    // Respuesta sin cuerpo JSON: no hay nada que indique token rancio.
    return false;
  }
};

export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  let res = await fetchWithTimeout(input, init);

  if (await isStaleTokenResponse(res)) {
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
        res = await fetchWithTimeout(input, newInit);
      }
    }
  }

  return res;
};
