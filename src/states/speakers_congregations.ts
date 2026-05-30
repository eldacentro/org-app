/*
This file holds the source of the truth from the table "speakers_congregations".
*/

import { atom } from 'jotai';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { congNameState, congNumberState } from './settings';

export const speakersCongregationsState = atom<SpeakersCongregationsType[]>([]);

export const speakersCongregationsActiveState = atom((get) => {
  const congregations = get(speakersCongregationsState);

  return congregations.filter((record) => {
    const isDeleted = record._deleted
      ? typeof record._deleted === 'object'
        ? (record._deleted as { value: boolean }).value === true
        : record._deleted === true
      : false;
    return !isDeleted;
  });
});

export const incomingCongSpeakersState = atom((get) => {
  const congregations = get(speakersCongregationsActiveState);
  const congName = get(congNameState);
  const congNumber = get(congNumberState);

  const normalize = (str: unknown) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const normalizedHomeName = normalize(congName);

  const localCong = congregations.find((record) => {
    if (!record.cong_data) return false;
    const nameVal = typeof record.cong_data.cong_name === 'object'
      ? record.cong_data.cong_name?.value
      : record.cong_data.cong_name;
    const numVal = typeof record.cong_data.cong_number === 'object'
      ? record.cong_data.cong_number?.value
      : record.cong_data.cong_number;

    const recordName = normalize(nameVal);
    const recordNumber = String(numVal || '').trim();
    
    return (
      (recordName !== '' && recordName === normalizedHomeName) ||
      (recordNumber !== '' && recordNumber === congNumber)
    );
  });

  const localCongId = localCong?.id;

  const incomingCongregations = congregations.filter(
    (record) => record.id !== localCongId
  );

  return incomingCongregations.sort((a, b) => {
    const aNameVal = typeof a.cong_data?.cong_name === 'object' ? a.cong_data.cong_name?.value : a.cong_data?.cong_name;
    const bNameVal = typeof b.cong_data?.cong_name === 'object' ? b.cong_data.cong_name?.value : b.cong_data?.cong_name;
    const aName = String(aNameVal || '');
    const bName = String(bNameVal || '');
    return aName.localeCompare(bName);
  });
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
