import { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  congNewState,
  firstnameState,
  settingsState,
} from '@states/settings';
import { isMyAssignmentOpenState, myAssignmentsBadgeState } from '@states/app';
import { isTest } from '@constants/index';

const useDashboard = () => {
  const setIsMyAssignmentOpen = useSetAtom(isMyAssignmentOpenState);

  const firstName = useAtomValue(firstnameState);
  const isCongNew = useAtomValue(congNewState);
  const settings = useAtomValue(settingsState);

  const isMigrated = useMemo(() => {
    return settings.cong_settings.cong_migrated ?? false;
  }, [settings]);

  const initialSnackValue = useMemo(() => {
    return !isMigrated && isCongNew && !isTest;
  }, [isCongNew, isMigrated]);

  const [newCongSnack, setNewCongSnack] = useState(initialSnackValue);

  // Publicado por useMyAssignments (montado siempre en el layout raíz):
  // exactamente el mismo cálculo que muestra el diálogo — antes este número
  // se calculaba aparte y se desincronizaba (contaba reuniones/salidas ya
  // pasadas de la semana y no sabía de limpieza ni de la visita del CO).
  const countFutureAssignments = useAtomValue(myAssignmentsBadgeState);

  const handleCloseNewCongNotice = async () => {
    setNewCongSnack(false);
  };

  const handleOpenMyAssignments = async () => {
    setIsMyAssignmentOpen(true);
  };

  return {
    firstName,
    isCongNew,
    handleCloseNewCongNotice,
    handleOpenMyAssignments,
    countFutureAssignments,
    isMigrated,
    newCongSnack,
  };
};

export default useDashboard;
