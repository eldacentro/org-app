import { useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  incomingCongSpeakersState,
  isAddingCongregationState,
} from '@states/speakers_congregations';
import { circuitNumberState } from '@states/settings';
import { incomingSpeakersState } from '@states/visiting_speakers';
import { ordenarPorNombre } from '@services/app/speakers_congregations';

const useOtherCongregations = () => {
  const [isAdding, setIsAdding] = useAtom(isAddingCongregationState);

  const incomingCongs = useAtomValue(incomingCongSpeakersState);
  const circuitNumber = useAtomValue(circuitNumberState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);

  const [currentExpanded, setCurrenExpanded] = useState('');

  const handleIsAddingClose = () => setIsAdding(false);

  const handleSetExpanded = (value: string) => setCurrenExpanded(value);

  // Por nombre las dos, que es como se busca con el dedo. Antes salían en el
  // orden en que las devolvía la base de datos, que no es ninguno.
  const circuitCongs = useMemo(
    () =>
      ordenarPorNombre(
        incomingCongs.filter(
          (c) => c.cong_data.cong_circuit.value === circuitNumber
        )
      ),
    [incomingCongs, circuitNumber]
  );

  const otherCongs = useMemo(
    () =>
      ordenarPorNombre(
        incomingCongs.filter(
          (c) => c.cong_data.cong_circuit.value !== circuitNumber
        )
      ),
    [incomingCongs, circuitNumber]
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
