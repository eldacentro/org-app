import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  personsFilterOpenState,
} from '@states/persons';
import { personSchema } from '@services/dexie/schema';
import { setPersonCurrentDetails } from '@services/states/persons';
import { apiCongregationUsersGet } from '@services/api/congregation';
import { congAccountConnectedState } from '@states/app';
import { congregationUsersState } from '@states/congregation';
import useCurrentUser from '@hooks/useCurrentUser';

const useAllPersons = () => {
  const [isDataExchangeOpen, setIsDataExchangeOpen] = useState(false);

  const handleOpenExchange = () => setIsDataExchangeOpen(true);

  const handleCloseExchange = () => setIsDataExchangeOpen(false);

  const navigate = useNavigate();

  const { isAdmin } = useCurrentUser();

  const [isPanelOpen, setIsPanelOpen] = useAtom(personsFilterOpenState);

  const setUsers = useSetAtom(congregationUsersState);

  const isConnected = useAtomValue(congAccountConnectedState);

  const { data } = useQuery({
    queryKey: ['congregation_users'],
    queryFn: apiCongregationUsersGet,
    refetchOnMount: 'always',
    enabled: isConnected && isAdmin,
  });

  const handlePersonAdd = async () => {
    // Partir del schema vacío, no del último hermano visto (evita flash de datos viejos)
    const newPerson = structuredClone(personSchema);
    newPerson.person_uid = crypto.randomUUID();

    setPersonCurrentDetails(newPerson);

    navigate('/persons/new');
  };

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setUsers(data);
    }
  }, [setUsers, data]);

  return {
    handlePersonAdd,
    isPanelOpen,
    setIsPanelOpen,
    isDataExchangeOpen,
    handleOpenExchange,
    handleCloseExchange,
  };
};

export default useAllPersons;
