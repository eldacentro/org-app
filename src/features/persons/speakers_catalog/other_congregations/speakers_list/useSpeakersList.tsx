import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { dbVisitingSpeakersAdd } from '@services/dexie/visiting_speakers';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import {
  speakersCatalogSearchState,
  speakersCongregationsState,
} from '@states/speakers_congregations';
import {
  congregacionCoincide,
  oradorCoincide,
  prepararBusqueda,
} from '@services/app/speakers_congregations';
import { speakersSortByName } from '@services/app/visiting_speakers';

const useSpeakersList = (
  cong_id: string,
  isEdit: boolean,
  congSynced: boolean
) => {
  const visitingSpeakers = useAtomValue(visitingSpeakersActiveState);
  const congregations = useAtomValue(speakersCongregationsState);
  const busqueda = useAtomValue(speakersCatalogSearchState);

  const [speakers, setSpeakers] = useState(visitingSpeakers);

  const congregation = useMemo(() => {
    return congregations.find(
      (record) => record.id === cong_id && record._deleted.value === false
    );
  }, [congregations, cong_id]);

  const filteredList = useMemo(() => {
    const deLaCongregacion = speakers.filter(
      (record) => record.speaker_data.cong_id === cong_id
    );

    const palabras = prepararBusqueda(busqueda);

    if (palabras.length === 0) return deLaCongregacion;

    // Si lo buscado es la propia congregación —su nombre, su número o su
    // circuito—, salen TODOS sus oradores: se ha pedido ver esa congregación,
    // no un hermano suyo. Filtrar también aquí dejaría la congregación abierta
    // y vacía, que se lee como «no tiene oradores».
    const esLaCongregacion =
      congregation &&
      congregacionCoincide(
        {
          nombre: congregation.cong_data.cong_name.value,
          numero: congregation.cong_data.cong_number.value,
          circuito: congregation.cong_data.cong_circuit.value,
        },
        palabras
      );

    if (esLaCongregacion) return deLaCongregacion;

    return deLaCongregacion.filter((record) =>
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
  }, [speakers, cong_id, busqueda, congregation]);

  const incomingSpeakers = useMemo(() => {
    return isEdit ? filteredList : speakersSortByName(filteredList);
  }, [filteredList, isEdit]);

  /**
   * QUÉ SE MIRA Y QUÉ SE EDITA.
   *
   * Todo depende de si esta congregación tiene una FUENTE que la mantenga (el
   * Google Sheets del circuito, o la propia congregación si usa la app):
   *
   *  · Sin fuente, no hay nada que respetar: la lista es de quien la escribe,
   *    así que se edita entera. Es como funcionó siempre, y hay que dejarlo
   *    igual — si no, los oradores metidos a mano antes de que existiera la
   *    marca (que no la llevan) desaparecerían de la pantalla de edición.
   *  · Con fuente, lo suyo solo se mira —editarlo aquí duraría hasta la
   *    siguiente sincronización— y lo añadido a mano se edita, hasta que la
   *    fuente lo reclame y apague su marca.
   *
   * Y mirando (fuera del modo edición) SIEMPRE salen todos: un orador
   * añadido a mano tiene que verse en la lista normal como cualquier otro.
   */
  const manualAdded = useMemo(() => {
    return incomingSpeakers.filter(
      (record) => record.speaker_data.manual?.value === true
    );
  }, [incomingSpeakers]);

  const sourceOwned = useMemo(() => {
    return incomingSpeakers.filter(
      (record) => record.speaker_data.manual?.value !== true
    );
  }, [incomingSpeakers]);

  const viewList = useMemo(() => {
    if (!isEdit) return incomingSpeakers;

    return congSynced ? sourceOwned : [];
  }, [isEdit, congSynced, incomingSpeakers, sourceOwned]);

  const editList = useMemo(() => {
    if (!isEdit) return [];

    return congSynced ? manualAdded : incomingSpeakers;
  }, [isEdit, congSynced, incomingSpeakers, manualAdded]);

  const handleVisitingSpeakersAdd = async (cong_id: string) => {
    await dbVisitingSpeakersAdd(cong_id);
  };

  useEffect(() => {
    setSpeakers((prev) => {
      const data = prev.filter((record) =>
        visitingSpeakers.some((s) => s.person_uid === record.person_uid)
      );

      for (const speaker of visitingSpeakers) {
        const index = data.findIndex(
          (record) => record.person_uid === speaker.person_uid
        );

        if (index !== -1) {
          data[index] = speaker;
        }

        if (index === -1) {
          data.push(speaker);
        }
      }

      return data;
    });
  }, [visitingSpeakers]);

  return {
    handleVisitingSpeakersAdd,
    incomingSpeakers,
    congregation,
    viewList,
    editList,
  };
};

export default useSpeakersList;
