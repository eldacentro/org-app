import { useSetAtom } from 'jotai';
import { isCongAccountCreateState, isUserAccountCreatedState } from '@states/app';

const useUserAccountCreated = () => {
  const setCongCreate = useSetAtom(isCongAccountCreateState);
  const setUserCreated = useSetAtom(isUserAccountCreatedState);

  const handleCreateCongregation = () => {
    setUserCreated(false);
    setCongCreate(true);
  };

  return { handleCreateCongregation };
};

export default useUserAccountCreated;
