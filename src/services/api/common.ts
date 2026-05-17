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
  const appVersion = import.meta.env.PACKAGE_VERSION;
  const appLang = store.get(appLangState);
  const congID = store.get(congIDState);
  const isOnline = store.get(isOnlineState);
  const JWLang = store.get(JWLangState);
  const userID = store.get(userIDState);
  const roles = store.get(congRoleState);

  const authUser = user || currentAuthUser();
  const userUID = authUser?.uid;
  const idToken = await authUser?.getIdToken();

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
