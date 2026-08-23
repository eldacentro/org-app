import { useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  incomingCongSpeakersState,
  isAddingCongregationState,
} from '@states/speakers_congregations';
import { circuitNumberState } from '@states/settings';
import { incomingSpeakersState } from '@states/visiting_speakers';
import {
  circuitosDeLaLista,
  filtrarPorCircuito,
  ordenarPorNombre,
} from '@services/app/speakers_congregations';

const useOtherCongregations = () => {
  const [isAdding, setIsAdding] = useAtom(isAddingCongregationState);

  const incomingCongs = useAtomValue(incomingCongSpeakersState);
  const circuitNumber = useAtomValue(circuitNumberState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);

  const [currentExpanded, setCurrenExpanded] = useState('');

  /** Qué circuito se está mirando en «Otras congregaciones». Vacío = todos. */
  const [circuitoFiltro, setCircuitoFiltro] = useState('');

  const handleIsAddingClose = () => setIsAdding(false);

  const handleSetExpanded = (value: string) => setCurrenExpanded(value);

  const handleCircuitoFiltro = (value: string) =>
    setCircuitoFiltro((actual) => (actual === value ? '' : value));

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

  const otherCongsTodas = useMemo(
    () =>
      ordenarPorNombre(
        incomingCongs.filter(
          (c) => c.cong_data.cong_circuit.value !== circuitNumber
        )
      ),
    [incomingCongs, circuitNumber]
  );

  /**
   * Los circuitos que se pueden filtrar.
   *
   * Con uno solo no se enseña la tira: un filtro con una única opción no filtra
   * nada y ocupa una línea. Ver la pantalla.
   */
  const circuitosOtros = useMemo(
    () => circuitosDeLaLista(otherCongsTodas),
    [otherCongsTodas]
  );

  const otherCongs = useMemo(
    () => filtrarPorCircuito(otherCongsTodas, circuitoFiltro),
    [otherCongsTodas, circuitoFiltro]
  );

  const circuitSpeakersCount = incomingSpeakers.filter((s) =>
    circuitCongs.some((c) => c.id === s.speaker_data.cong_id)
  ).length;

  // El contador de la cabecera cuenta SIEMPRE todas, filtre o no filtre el
  // usuario: dice cuántos oradores hay ahí fuera, no cuántos se están viendo.
  // Si bajara al filtrar parecería que el filtro borra oradores.
  const otherSpeakersCount = incomingSpeakers.filter((s) =>
    otherCongsTodas.some((c) => c.id === s.speaker_data.cong_id)
  ).length;

  return {
    circuitCongs,
    otherCongs,
    circuitosOtros,
    circuitoFiltro,
    handleCircuitoFiltro,
    circuitSpeakersCount,
    otherSpeakersCount,
    isAdding,
    handleIsAddingClose,
    currentExpanded,
    handleSetExpanded,
  };
};

export default useOtherCongregations;
