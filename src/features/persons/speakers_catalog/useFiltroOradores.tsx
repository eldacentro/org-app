import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { speakersCatalogSearchState } from '@states/speakers_congregations';
import {
  oradorCoincide,
  prepararBusqueda,
} from '@services/app/speakers_congregations';

/**
 * Deja de una lista de oradores los que responden al buscador.
 *
 * Aparte y compartido porque lo necesitan las tres listas de «Tu congregación»
 * —locales y salientes— y hacerlo tres veces sería tres sitios donde el día de
 * mañana la búsqueda funciona distinto.
 *
 * Se aplica al DIBUJAR y no dentro de los hooks que mantienen esas listas: esos
 * llevan su propio estado sincronizado con un efecto, y meter el filtro ahí
 * dentro haría que al escribir en el buscador se reescribiera ese estado. Aquí
 * solo se decide qué se enseña.
 */
const useFiltroOradores = (lista: VisitingSpeakerType[]) => {
  const busqueda = useAtomValue(speakersCatalogSearchState);

  return useMemo(() => {
    const palabras = prepararBusqueda(busqueda);

    if (palabras.length === 0) return lista;

    return lista.filter((record) =>
      oradorCoincide(
        {
          nombre: [
            record.speaker_data.person_firstname.value,
            record.speaker_data.person_lastname.value,
            record.speaker_data.person_display_name.value,
          ].join(' '),
          discursos: record.speaker_data.talks
            .filter((talk) => !talk._deleted)
            .map((talk) => talk.talk_number),
        },
        palabras
      )
    );
  }, [lista, busqueda]);
};

export default useFiltroOradores;
