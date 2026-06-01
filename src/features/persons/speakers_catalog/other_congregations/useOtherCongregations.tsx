import { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  incomingCongSpeakersState,
  isAddingCongregationState,
} from '@states/speakers_congregations';
import { circuitNumberState } from '@states/settings';
import { incomingSpeakersState } from '@states/visiting_speakers';

const useOtherCongregations = () => {
  const [isAdding, setIsAdding] = useAtom(isAddingCongregationState);

  const incomingCongs = useAtomValue(incomingCongSpeakersState);
  const circuitNumber = useAtomValue(circuitNumberState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);

  const [currentExpanded, setCurrenExpanded] = useState('');

  const handleIsAddingClose = () => setIsAdding(false);

  const handleSetExpanded = (value: string) => setCurrenExpanded(value);

  const circuitCongs = incomingCongs.filter(
    (c) => c.cong_data.cong_circuit.value === circuitNumber
  );

  const otherCongs = incomingCongs.filter(
    (c) => c.cong_data.cong_circuit.value !== circuitNumber
  );

  const circuitSpeakersCount = incomingSpeakers.filter((s) =>
    circuitCongs.some((c) => c.id === s.speaker_data.cong_id)
  ).length;

  const otherSpeakersCount = incomingSpeakers.filter((s) =>
    otherCongs.some((c) => c.id === s.speaker_data.cong_id)
  ).length;

  return {
    circuitCongs,
    otherCongs,
    circuitSpeakersCount,
    otherSpeakersCount,
    isAdding,
    handleIsAddingClose,
    currentExpanded,
    handleSetExpanded,
  };
};

export default useOtherCongregations;
