/*
This file holds the source of the truth from the table "visiting_speakers".
*/

import { atom } from 'jotai';
import { congNameState, congNumberState } from './settings';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { speakersCongregationsActiveState } from './speakers_congregations';
import { personsState } from './persons';
import { personIsElder, personIsMS } from '@services/app/persons';
import { resolveLocalCongId } from '@services/app/visiting_speakers_reconcile';

export const visitingSpeakersState = atom<VisitingSpeakerType[]>([]);

export const visitingSpeakersActiveState = atom((get) => {
  const speakers = get(visitingSpeakersState);
  return speakers.filter((record) => {
    const isDeleted = record._deleted
      ? typeof record._deleted === 'object'
        ? (record._deleted as { value: boolean }).value === true
        : record._deleted === true
      : false;
    return !isDeleted;
  });
});

export const myCongSpeakersState = atom((get) => {
  const speakers = get(visitingSpeakersActiveState);

  if (!speakers) return [];

  const congregations = get(speakersCongregationsActiveState);
  const congName = get(congNameState);
  const congNumber = get(congNumberState);

  const congId = resolveLocalCongId(congregations, congName, congNumber);

  const outgoingSpeakers = speakers.filter(
    (record) => record.speaker_data.cong_id === congId
  );

  return outgoingSpeakers;
});

export const outgoingSpeakersState = atom((get) => {
  const speakers = get(myCongSpeakersState);
  const persons = get(personsState);

  const outgoingSpeakers = speakers
    .filter((record) => !record.speaker_data.local.value)
    .map((speaker) => {
      const findPerson = persons.find(
        (record) => record.person_uid === speaker.person_uid
      );

      return {
        person_uid: speaker.person_uid,
        _deleted: speaker._deleted,
        speaker_data: {
          ...speaker.speaker_data,
          person_display_name: {
            value:
              findPerson?.person_data.person_display_name.value ||
              speaker.speaker_data.person_display_name.value ||
              '',
            updatedAt: '',
          },
          person_firstname: {
            value:
              findPerson?.person_data.person_firstname.value ||
              speaker.speaker_data.person_firstname.value ||
              '',
            updatedAt: '',
          },
          person_lastname: {
            value:
              findPerson?.person_data.person_lastname.value ||
              speaker.speaker_data.person_lastname.value ||
              '',
            updatedAt: '',
          },
          elder: {
            value: findPerson
              ? personIsElder(findPerson)
              : speaker.speaker_data.elder.value,
            updatedAt: '',
          },
          ministerial_servant: {
            value: findPerson
              ? personIsMS(findPerson)
              : speaker.speaker_data.ministerial_servant.value,
            updatedAt: '',
          },
          person_email: {
            value:
              findPerson?.person_data.email.value ||
              speaker.speaker_data.person_email.value ||
              '',
            updatedAt: '',
          },
          person_phone: {
            value:
              findPerson?.person_data.phone.value ||
              speaker.speaker_data.person_phone.value ||
              '',
            updatedAt: '',
          },
        },
      } as VisitingSpeakerType;
    });

  return outgoingSpeakers;
});

export const localSpeakersState = atom((get) => {
  const speakers = get(myCongSpeakersState);
  const persons = get(personsState);

  const localSpeakers = speakers
    .filter((record) => record.speaker_data.local.value)
    .map((speaker) => {
      const findPerson = persons.find(
        (record) => record.person_uid === speaker.person_uid
      );

      return {
        person_uid: speaker.person_uid,
        _deleted: speaker._deleted,
        speaker_data: {
          ...speaker.speaker_data,
          person_display_name: {
            value:
              findPerson?.person_data.person_display_name.value ||
              speaker.speaker_data.person_display_name.value ||
              '',
            updatedAt: '',
          },
          person_firstname: {
            value:
              findPerson?.person_data.person_firstname.value ||
              speaker.speaker_data.person_firstname.value ||
              '',
            updatedAt: '',
          },
          person_lastname: {
            value:
              findPerson?.person_data.person_lastname.value ||
              speaker.speaker_data.person_lastname.value ||
              '',
            updatedAt: '',
          },
          elder: {
            value: findPerson
              ? personIsElder(findPerson)
              : speaker.speaker_data.elder.value,
            updatedAt: '',
          },
          ministerial_servant: {
            value: findPerson
              ? personIsMS(findPerson)
              : speaker.speaker_data.ministerial_servant.value,
            updatedAt: '',
          },
          person_email: {
            value:
              findPerson?.person_data.email.value ||
              speaker.speaker_data.person_email.value ||
              '',
            updatedAt: '',
          },
          person_phone: {
            value:
              findPerson?.person_data.phone.value ||
              speaker.speaker_data.person_phone.value ||
              '',
            updatedAt: '',
          },
        },
      } as VisitingSpeakerType;
    });

  return localSpeakers;
});

export const incomingSpeakersState = atom((get) => {
  const speakers = get(visitingSpeakersActiveState);
  const congregations = get(speakersCongregationsActiveState);
  const congName = get(congNameState);
  const congNumber = get(congNumberState);

  // Misma resolución (nombre normalizado o número) que myCongSpeakersState —
  // antes esta usaba solo el número, así que si el número no calzaba pero
  // el nombre sí, un orador saliente propio podía colarse aquí como si fuera
  // un orador visitante de otra congregación.
  const localId = resolveLocalCongId(congregations, congName, congNumber);

  const incomingSpeakers =
    speakers.filter((record) => {
      const isLocal = record.speaker_data.cong_id === localId;

      if (isLocal) return false;

      const speakerCong = congregations.find(
        (c) => c.id === record.speaker_data.cong_id
      );

      if (!speakerCong || speakerCong._deleted.value) return false;

      return true;
    }) || [];

  return incomingSpeakers;
});
