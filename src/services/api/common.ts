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
  // Número de build (total de commits, se inyecta al compilar). A diferencia de
  // appVersion —una constante que casi nunca cambia— este sí distingue a quien
  // lleva una app de hace semanas, que es lo que el administrador necesita ver.
  const appBuild = typeof __BUILD_NUMBER__ === 'string' ? __BUILD_NUMBER__ : '';
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
    appBuild,
  };
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onTokenRefreshed = (token: string) => {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach((cb) => cb(token));
};

// Tope de espera para quien esté aguardando a que OTRA petición termine de
// renovar el token. Sin él, si esa otra petición muriera de una forma que no
// llegara a avisar, quien esperaba se quedaba colgado para siempre — y una
// petición colgada para siempre es peor que una que falla, porque no se
// reintenta ni se ve.
const REFRESH_WAIT_TIMEOUT_MS = 25000;

const waitForTokenRefresh = () =>
  new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve(''), REFRESH_WAIT_TIMEOUT_MS);

    refreshSubscribers.push((token) => {
      clearTimeout(timer);
      resolve(token);
    });
  });

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
      // OJO con el orden. Antes, quien renovaba el token avisaba a los que
      // esperaban y ACTO SEGUIDO se ponía él mismo a esperar un aviso que ya
      // había dado: se quedaba colgado para siempre. La petición nunca volvía,
      // así que la app se quedaba "cargando" sin error, sin reintento y sin
      // que nada la despertara. Ese camino solo se activa cuando el servidor
      // rechaza el token, o sea justo cuando más falta hace que funcione.
      let newToken: string;

      if (isRefreshing) {
        // otra petición ya está renovando: esperar SU resultado
        newToken = await waitForTokenRefresh();
      } else {
        isRefreshing = true;

        try {
          newToken = await authUser.getIdToken(true);
        } catch (error) {
          newToken = '';
          console.error('Error refreshing token:', error);
        } finally {
          isRefreshing = false;
          // el aviso sale siempre, también si la renovación falló, para que
          // nadie se quede esperando
          onTokenRefreshed(newToken!);
        }
      }

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
