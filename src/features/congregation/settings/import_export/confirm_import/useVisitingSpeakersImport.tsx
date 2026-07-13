import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { updatedAtOverride } from '@utils/common';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import {
  reconcileOutgoingSpeakerLinks,
  resolveLocalCongId,
} from '@services/app/visiting_speakers';
import appDb from '@db/appDb';

const useVisitingSpeakersImport = () => {
  const getVisitingSpeakers = async (speakers: VisitingSpeakerType[]) => {
    // Las importaciones externas (p. ej. la hoja de cálculo del circuito)
    // no conocen el person_uid interno de la app, así que suelen traer un
    // identificador propio para cada orador saliente. Antes de nada, se
    // intenta reconectar esos registros con su Persona real por nombre —
    // así el enlace queda correcto de verdad en cada sincronización diaria,
    // no solo el nombre mostrado. Solo se aplica a discursantes de ESTA
    // congregación (localCongId) — nunca a los del circuito, para no
    // enlazar por error con un publicador local homónimo.
    const persons = await appDb.persons.toArray();
    const activePersons = persons.filter((person) => {
      if (person._deleted.value) return false;
      return !(person.person_data.archived?.value ?? false);
    });

    const settings = await appDb.app_settings.get(1);
    const congregations = await appDb.speakers_congregations.toArray();
    const localCongId = resolveLocalCongId(
      congregations,
      settings?.cong_settings.cong_name ?? '',
      settings?.cong_settings.cong_number.value ?? ''
    );

    // Ids de las congregaciones que existen como registro: lo que no esté aquí
    // es un cong_id phantom que reconcile sanea a la congregación de casa.
    const validCongIds = new Set(congregations.map((record) => record.id));

    const { speakers: reconciledSpeakers } = reconcileOutgoingSpeakerLinks(
      speakers,
      activePersons,
      localCongId,
      validCongIds
    );

    const result: VisitingSpeakerType[] = [];

    result.push(...reconciledSpeakers);

    const oldSpeakers = await appDb.visiting_speakers.toArray();

    for (const oldSpeaker of oldSpeakers) {
      const newSpeaker = reconciledSpeakers.find(
        (record) => record.person_uid === oldSpeaker.person_uid
      );

      if (!newSpeaker) {
        oldSpeaker._deleted = {
          value: true,
          updatedAt: new Date().toISOString(),
        };

        result.push(oldSpeaker);
      }
    }

    return result.map((record) => {
      const data = updatedAtOverride(record);
      return data;
    });
  };

  const getSpeakersCongregations = async (
    congregations: SpeakersCongregationsType[]
  ) => {
    const result: SpeakersCongregationsType[] = [];

    result.push(...congregations);

    const oldCongregations = await appDb.speakers_congregations.toArray();

    for (const oldCongregation of oldCongregations) {
      const newCongregation = congregations.find(
        (record) => record.id === oldCongregation.id
      );

      if (!newCongregation) {
        oldCongregation._deleted = {
          value: true,
          updatedAt: new Date().toISOString(),
        };

        result.push(oldCongregation);
      }
    }

    return result.map((record) => {
      const data = updatedAtOverride(record);
      return data;
    });
  };

  return { getVisitingSpeakers, getSpeakersCongregations };
};

export default useVisitingSpeakersImport;
