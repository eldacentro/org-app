import { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  incomingCongSpeakersState,
  isAddingCongregationState,
} from '@states/speakers_congregations';
import { circuitNumberState } from '@states/settings';

const useOtherCongregations = () => {
  const [isAdding, setIsAdding] = useAtom(isAddingCongregationState);

  const incomingCongs = useAtomValue(incomingCongSpeakersState);
  const circuitNumber = useAtomValue(circuitNumberState);

  const [currentExpanded, setCurrenExpanded] = useState('');

  const handleIsAddingClose = () => setIsAdding(false);

  const handleSetExpanded = (value: string) => setCurrenExpanded(value);

  const circuitCongs = incomingCongs.filter(
    (c) => c.cong_data.cong_circuit.value === circuitNumber
  );

  const otherCongs = incomingCongs.filter(
    (c) => c.cong_data.cong_circuit.value !== circuitNumber
  );

  return {
    circuitCongs,
    otherCongs,
    isAdding,
    handleIsAddingClose,
    currentExpanded,
    handleSetExpanded,
  };
};

export default useOtherCongregations;
