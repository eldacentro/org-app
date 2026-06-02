import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  isAccountChooseState,
  isDbReadyState,
  isSetupState,
  isUnauthorizedRoleState,
} from '@states/app';
import { accountTypeState } from '@states/settings';
import { setIsAccountChoose } from '@services/states/app';

const useStartup = () => {
  const isUnauthorizedRole = useAtomValue(isUnauthorizedRoleState);
  const isSetup = useAtomValue(isSetupState);
  const accountType = useAtomValue(accountTypeState);
  const isAccountChoose = useAtomValue(isAccountChooseState);
  const isDbReady = useAtomValue(isDbReadyState);

  const [isAuth, setIsAuth] = useState(true);

  useEffect(() => {
    if (!isDbReady) return;

    if (accountType !== '') {
      setIsAccountChoose(false);
    } else {
      setIsAccountChoose(true);
    }

    setIsAuth(false);
  }, [accountType, isDbReady]);

  return { isUnauthorizedRole, isSetup, isAuth, isAccountChoose, accountType };
};

export default useStartup;
