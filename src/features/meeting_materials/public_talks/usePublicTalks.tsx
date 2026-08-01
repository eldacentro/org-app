import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  publicTalksLocaleState,
  publicTalksSearchKeyState,
} from '@states/public_talks';
import { setPublicTalksSearchKey } from '@services/states/publicTalks';
import { assignmentsHistoryState } from '@states/schedules';
import { AssignmentCode } from '@definition/assignment';
import { TalkItemType } from './index.types';
import { personsAllState } from '@states/persons';
import { personGetDisplayName, speakerGetDisplayName } from '@utils/common';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import useSorting from '@components/table/useSorting';
import { Order } from '@components/table/index.types';

const usePublicTalks = () => {
  const talksList = useAtomValue(publicTalksLocaleState);
  const txtSearch = useAtomValue(publicTalksSearchKeyState);
  const assignmentsHistory = useAtomValue(assignmentsHistoryState);
  const persons = useAtomValue(personsAllState);
  const useDisplayName = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const speakers = useAtomValue(visitingSpeakersActiveState);
  const dataView = useAtomValue(userDataViewState);

  const [isExpandAll, setIsExpandAll] = useState(false);
  const [labelSearch, setLabelSearch] = useState('tr_countPublicTalks');

  const historyByView = useMemo(() => {
    return assignmentsHistory.filter(
      (record) =>
        record.assignment.dataView === dataView &&
        record.assignment.code !== AssignmentCode.WM_SpeakerOutgoing
    );
  }, [assignmentsHistory, dataView]);

  const talks = useMemo(() => {
    const results: TalkItemType[] = [];

    for (const talk of talksList) {
      const history = historyByView.filter(
        (record) => record.assignment.public_talk === talk.talk_number
      );

      const personsFormatted = history.map((person) => {
        let speakerName = '';

        const findPerson = persons.find(
          (record) => record.person_uid === person.assignment.person
        );

        if (findPerson) {
          speakerName = personGetDisplayName(
            findPerson,
            useDisplayName,
            fullnameOption
          );
        }

        if (!findPerson) {
          const findSpeaker = speakers.find(
            (record) => record.person_uid === person.assignment.person
          );

          if (findSpeaker) {
            speakerName = `${speakerGetDisplayName(
              findSpeaker,
              useDisplayName,
              fullnameOption
            )} (*)`;
          }
        }

        return {
          date: person.weekOf,
          person: speakerName,
        };
      });

      // Título, orador Y número. La lista se enseña numerada y los discursos
      // se nombran por su número ("el 42"), pero teclearlo no encontraba nada:
      // el número era lo único por lo que no se podía buscar. Casa por el
      // principio —"4" trae el 4, el 40 y el 42, no el 104—, que es como se
      // busca en una lista ordenada por número.
      const search = txtSearch.trim().toLowerCase();

      if (
        search.length === 0 ||
        talk.talk_title.toLowerCase().includes(search) ||
        String(talk.talk_number).startsWith(search) ||
        personsFormatted.find((record) =>
          record.person.toLowerCase().includes(search)
        )
      ) {
        results.push({
          talk_number: talk.talk_number,
          talk_title: talk.talk_title,
          last_date: personsFormatted.at(0)?.date || '',
          last_speaker: personsFormatted.at(0)?.person || '',
          history: personsFormatted,
        });
      }
    }

    return results;
  }, [
    talksList,
    historyByView,
    persons,
    fullnameOption,
    useDisplayName,
    txtSearch,
    speakers,
  ]);

  /**
   * El orden de la lista, y su desplegable.
   *
   * Vive aquí y no dentro de la vista de lista porque el mando se enseña en la
   * fila del título, junto al contador — arriba del todo, con el buscador. Si
   * el estado se quedara abajo, el control tendría que estar abajo también, y
   * ahí queda descolgado: buscador, título, y solo entonces "ordenar por".
   *
   * Cada opción ES un orden entero, no un campo al que después haya que
   * decidirle la dirección. Por eso la fecha son DOS entradas: las dos se
   * usan, y para cosas distintas.
   *
   * Un discurso que no se ha dado nunca tiene la fecha vacía, y una cadena
   * vacía va antes que cualquier fecha. O sea que «Fecha más antigua» pone
   * primero los que no se han dado nunca — que es coherente con lo que dice
   * (no hay fecha más antigua que ninguna) y es justo lo que se busca al
   * mirar por aquí: el discurso que hace tiempo que no suena.
   */
  const sortOptions: { value: string; label: string; direction: Order }[] = [
    {
      value: 'talk_number',
      label: 'Número',
      direction: 'asc',
    },
    { value: 'talk_title', label: 'Título (A–Z)', direction: 'asc' },
    {
      value: 'last_date',
      label: 'Fecha más reciente',
      direction: 'desc',
    },
    {
      value: 'last_date_asc',
      label: 'Fecha más antigua',
      direction: 'asc',
    },
    { value: 'last_speaker', label: 'Orador (A–Z)', direction: 'asc' },
  ];

  const { order, orderBy, setSorting, visibleRows } = useSorting({
    initialOrder: 'asc',
    // Por número, que es el orden en el que se lee un guion de discursos.
    initialOrderBy: 'talk_number',
    rows: talks as unknown as { [key: string]: string | number }[],
  });

  // Lo elegido se LEE del orden que hay puesto, no de un estado aparte. Un
  // segundo estado que copia al primero es un sitio donde los dos se pueden
  // separar, y el día que pase el desplegable dirá una cosa y la tabla otra.
  const claveActual =
    orderBy === 'last_date' && order === 'asc' ? 'last_date_asc' : orderBy;

  const sortValue =
    sortOptions.find((option) => option.value === claveActual)?.value ??
    'talk_number';

  const handleSortChange = (value: string) => {
    const option = sortOptions.find((record) => record.value === value);

    if (!option) return;

    setSorting(
      option.value === 'last_date_asc' ? 'last_date' : option.value,
      option.direction
    );
  };

  const handleToggleExpandAll = () => {
    setIsExpandAll((prev) => !prev);
  };

  const handleSearch = (value: string) => setPublicTalksSearchKey(value);

  useEffect(() => {
    if (txtSearch.length === 0) {
      setLabelSearch('tr_countPublicTalks');
    }

    if (txtSearch.length > 0) {
      setLabelSearch('tr_searchResults');
    }
  }, [txtSearch]);

  return {
    talks,
    // Ordenada, para la vista de lista. La de tabla usa `talks` tal cual: es
    // una rejilla por años, y ahí el orden lo pone el número del discurso.
    talksSorted: visibleRows as unknown as typeof talks,
    sortOptions,
    sortValue,
    handleSortChange,
    isExpandAll,
    handleToggleExpandAll,
    handleSearch,
    labelSearch,
    txtSearch,
  };
};

export default usePublicTalks;
