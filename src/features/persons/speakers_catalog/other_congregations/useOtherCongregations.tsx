import { useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  incomingCongSpeakersState,
  isAddingCongregationState,
  speakersCatalogSearchState,
} from '@states/speakers_congregations';
import { circuitNumberState } from '@states/settings';
import { incomingSpeakersState } from '@states/visiting_speakers';
import {
  congregacionCoincide,
  ordenarPorNombre,
  oradorCoincide,
  prepararBusqueda,
} from '@services/app/speakers_congregations';

const useOtherCongregations = () => {
  const [isAdding, setIsAdding] = useAtom(isAddingCongregationState);

  const incomingCongs = useAtomValue(incomingCongSpeakersState);
  const circuitNumber = useAtomValue(circuitNumberState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const busqueda = useAtomValue(speakersCatalogSearchState);

  const palabras = useMemo(() => prepararBusqueda(busqueda), [busqueda]);

  /**
   * Una congregación entra si coincide ELLA o si coincide alguno de sus
   * oradores.
   *
   * Las dos cosas, y no solo la primera: buscando a un hermano por su nombre lo
   * que hace falta es que aparezca su congregación con él dentro. Si solo se
   * mirara la congregación, buscar «Fulano» no encontraría nada.
   */
  const pasaElFiltro = useMemo(() => {
    if (palabras.length === 0) return () => true;

    return (cong: (typeof incomingCongs)[number]) => {
      const propia = congregacionCoincide(
        {
          nombre: cong.cong_data.cong_name.value,
          numero: cong.cong_data.cong_number.value,
          circuito: cong.cong_data.cong_circuit.value,
        },
        palabras
      );

      if (propia) return true;

      return incomingSpeakers.some(
        (orador) =>
          orador.speaker_data.cong_id === cong.id &&
          oradorCoincide(
            {
              nombre: [
                orador.speaker_data.person_firstname.value,
                orador.speaker_data.person_lastname.value,
                orador.speaker_data.person_display_name.value,
              ].join(' '),
              discursos: orador.speaker_data.talks
                .filter((talk) => !talk._deleted)
                .map((talk) => talk.talk_number),
            },
            palabras
          )
      );
    };
  }, [palabras, incomingSpeakers]);

  const [currentExpanded, setCurrenExpanded] = useState('');

  const handleIsAddingClose = () => setIsAdding(false);

  const handleSetExpanded = (value: string) => setCurrenExpanded(value);

  // Por nombre las dos, que es como se busca con el dedo. Antes salían en el
  // orden en que las devolvía la base de datos, que no es ninguno.
  const circuitCongs = useMemo(
    () =>
      ordenarPorNombre(
        incomingCongs
          .filter((c) => c.cong_data.cong_circuit.value === circuitNumber)
          .filter(pasaElFiltro)
      ),
    [incomingCongs, circuitNumber, pasaElFiltro]
  );

  const otherCongs = useMemo(
    () =>
      ordenarPorNombre(
        incomingCongs
          .filter((c) => c.cong_data.cong_circuit.value !== circuitNumber)
          .filter(pasaElFiltro)
      ),
    [incomingCongs, circuitNumber, pasaElFiltro]
  );

  const circuitSpeakersCount = incomingSpeakers.filter((s) =>
    circuitCongs.some((c) => c.id === s.speaker_data.cong_id)
  ).length;

  const otherSpeakersCount = incomingSpeakers.filter((s) =>
    otherCongs.some((c) => c.id === s.speaker_data.cong_id)
  ).length;

  const buscando = palabras.length > 0;

  return {
    buscando,
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
