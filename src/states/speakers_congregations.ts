/*
This file holds the source of the truth from the table "speakers_congregations".
*/

import { atom } from 'jotai';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { congNameState, congNumberState } from './settings';

export const speakersCongregationsState = atom<SpeakersCongregationsType[]>([]);

export const speakersCongregationsActiveState = atom((get) => {
  const congregations = get(speakersCongregationsState);

  return congregations.filter((record) => record._deleted.value === false);
});

export const incomingCongSpeakersState = atom((get) => {
  const congregations = get(speakersCongregationsActiveState);
  const congName = get(congNameState);
  const congNumber = get(congNumberState);

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const normalizedHomeName = normalize(congName);

  const localCong = congregations.find((record) => {
    const recordName = normalize(record.cong_data.cong_name.value);
    const recordNumber = String(record.cong_data.cong_number.value || '').trim();
    return (
      (recordName !== '' && recordName === normalizedHomeName) ||
      (recordNumber !== '' && recordNumber === congNumber)
    );
  });

  const localCongId = localCong?.id;

  const incomingCongregations = congregations.filter(
    (record) => record.id !== localCongId
  );

  return incomingCongregations.sort((a, b) =>
    a.cong_data.cong_name.value.localeCompare(b.cong_data.cong_name.value)
  );
});

export const isAddingCongregationState = atom(false);

export const congregationsPendingState = atom((get) => {
  const congregations = get(speakersCongregationsActiveState);

  return congregations.filter(
    (record) => record.cong_data.request_status === 'pending'
  );
});

export const congregationsRemoteListState = atom((get) => {
  const congregations = get(speakersCongregationsActiveState);

  return congregations.filter((record) => record.cong_data.cong_id.length > 0);
});

export const congregationsNotDisapprovedState = atom((get) => {
  const congregations = get(speakersCongregationsActiveState);

  return congregations.filter(
    (record) => record.cong_data.request_status !== 'disapproved'
  );
});
