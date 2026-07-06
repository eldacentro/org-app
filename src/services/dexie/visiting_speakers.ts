import { UpdateSpec } from 'dexie';
import { dbSpeakersCongregationsCreateLocal } from './speakers_congregations';
import { vistingSpeakerSchema } from './schema';
import {
  VisitingSpeakerBackupType,
  VisitingSpeakerType,
} from '@definition/visiting_speakers';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { decryptData } from '@services/encryption';
import appDb from '@db/appDb';
import { AssignmentCode } from '@definition/assignment';
import { generateDisplayName } from '@utils/common';
import {
  diagnoseUnmatchedSpeakers,
  reconcileOutgoingSpeakerLinks,
  remapOutgoingTalkAssignments,
  resolveLocalCongId,
  SpeakerMatchDiagnostic,
} from '@services/app/visiting_speakers_reconcile';
import { dbUpdateSchedulesMetadata } from './schedules';

const dbUpdateVisitingSpeakersMetadata = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.visiting_speakers = {
    ...metadata.metadata.visiting_speakers,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbVisitingSpeakersLocalCongSpeakerAdd = async (local: boolean) => {
  try {
    const settings = await appDb.app_settings.get(1);
    const congName = settings.cong_settings.cong_name;
    const congregations = await appDb.speakers_congregations.toArray();

    const congExist = congregations.find(
      (record) => record.cong_data.cong_name.value === congName
    );

    if (!congExist) {
      await dbSpeakersCongregationsCreateLocal();
    }

    const congregationsNew = await appDb.speakers_congregations.toArray();

    const congLocal = congregationsNew.find(
      (record) => record.cong_data.cong_name.value === congName
    );

    const newSpeaker = structuredClone(vistingSpeakerSchema);
    newSpeaker.person_uid = crypto.randomUUID();
    newSpeaker.speaker_data.cong_id = congLocal.id;
    newSpeaker.speaker_data.local = {
      value: local,
      updatedAt: new Date().toISOString(),
    };

    await appDb.visiting_speakers.put(newSpeaker);
    await dbUpdateVisitingSpeakersMetadata();
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
};

export const dbVisitingSpeakersDelete = async (person_uid: string) => {
  try {
    const speaker = await appDb.visiting_speakers.get(person_uid);
    speaker._deleted = { value: true, updatedAt: new Date().toISOString() };
    await appDb.visiting_speakers.put(speaker);
    await dbUpdateVisitingSpeakersMetadata();
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
};

export const dbVisitingSpeakersUpdate = async (
  changes: UpdateSpec<VisitingSpeakerType>,
  person_uid: string
) => {
  try {
    // check if deleted speaker
    const speaker = changes.person_uid
      ? await appDb.visiting_speakers.get(changes.person_uid)
      : undefined;

    if (speaker) {
      // restore deleted
      speaker._deleted = { value: false, updatedAt: new Date().toISOString() };
      speaker.speaker_data.talks = [];

      // delete temp record
      const temp = await appDb.visiting_speakers.get(person_uid);
      temp._deleted = { value: true, updatedAt: new Date().toISOString() };

      await appDb.visiting_speakers.bulkPut([temp, speaker]);

      await appDb.visiting_speakers.update(speaker.person_uid, changes);
    }

    if (!speaker) {
      await appDb.visiting_speakers.update(person_uid, changes);
    }

    await dbUpdateVisitingSpeakersMetadata();
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
};

export const dbVisitingSpeakersAdd = async (cong_id: string) => {
  try {
    const newSpeaker = structuredClone(vistingSpeakerSchema);
    newSpeaker.person_uid = crypto.randomUUID();
    newSpeaker.speaker_data.cong_id = cong_id;

    await appDb.visiting_speakers.put(newSpeaker);
    await dbUpdateVisitingSpeakersMetadata();
  } catch (err) {
    console.error(err);
    throw new Error(err);
  }
};

// Igual que dbVisitingSpeakersAdd, pero con el nombre (y opcionalmente
// anciano/SM) ya puestos — para el alta rápida desde el selector de
// oradores de Reunión de fin de semana, sin pasar por una pantalla de
// edición aparte. Devuelve el registro creado para seleccionarlo al
// instante.
export const dbVisitingSpeakerQuickAdd = async (
  cong_id: string,
  firstname: string,
  lastname: string,
  isElder = false,
  isMinisterialServant = false
): Promise<VisitingSpeakerType> => {
  const now = new Date().toISOString();
  const newSpeaker = structuredClone(vistingSpeakerSchema);

  newSpeaker.person_uid = crypto.randomUUID();
  newSpeaker.speaker_data.cong_id = cong_id;
  newSpeaker.speaker_data.person_firstname = { value: firstname, updatedAt: now };
  newSpeaker.speaker_data.person_lastname = { value: lastname, updatedAt: now };
  newSpeaker.speaker_data.person_display_name = {
    value: generateDisplayName(lastname, firstname),
    updatedAt: now,
  };
  newSpeaker.speaker_data.elder = { value: isElder, updatedAt: now };
  newSpeaker.speaker_data.ministerial_servant = {
    value: isMinisterialServant,
    updatedAt: now,
  };

  await appDb.visiting_speakers.put(newSpeaker);
  await dbUpdateVisitingSpeakersMetadata();

  return newSpeaker;
};

export const decryptVisitingSpeakers = (
  visiting_speakers: VisitingSpeakerBackupType[],
  masterKey
) => {
  const result = visiting_speakers.map((speaker) => {
    const obj = {} as VisitingSpeakerType;

    obj.person_uid = JSON.parse(
      decryptData(speaker.person_uid, masterKey, 'speaker_person_uid')
    );

    obj._deleted = JSON.parse(
      decryptData(speaker._deleted, masterKey, 'speaker_deleted')
    );

    obj.speaker_data = JSON.parse(
      decryptData(speaker.speaker_data, masterKey, 'speaker_data')
    ) as VisitingSpeakerType['speaker_data'];

    return obj;
  });

  return result;
};

export const dbVisitingSpeakersUpdateRemote = async (
  newSpeakers: VisitingSpeakerType[],
  cong_id: string
) => {
  const speakers = await appDb.visiting_speakers.toArray();

  const oldSpeakers = speakers.filter(
    (record) => record.speaker_data.cong_id === cong_id
  );

  for (const speaker of newSpeakers) {
    const speakerAdd = structuredClone(speaker);
    speakerAdd.speaker_data.cong_id = cong_id;

    await appDb.visiting_speakers.put(speakerAdd);
    await dbUpdateVisitingSpeakersMetadata();
  }

  for (const speaker of oldSpeakers) {
    const findSpeaker = newSpeakers.find(
      (record) => record.person_uid === speaker.person_uid
    );

    if (!findSpeaker) {
      await appDb.visiting_speakers.delete(speaker.person_uid);
      await dbUpdateVisitingSpeakersMetadata();
    }
  }
};

export const dbVisitingSpeakersClearRemote = async (cong_id: string) => {
  const speakers = await appDb.visiting_speakers.toArray();

  const oldSpeakers = speakers.filter(
    (record) => record.speaker_data.cong_id === cong_id
  );

  for (const speaker of oldSpeakers) {
    await appDb.visiting_speakers.delete(speaker.person_uid);
    await dbUpdateVisitingSpeakersMetadata();
  }
};

export const dbVisitingSpeakersDummy = async () => {
  const settings = await appDb.app_settings.get(1);
  const congregations = await appDb.speakers_congregations.toArray();
  const persons = await appDb.persons.toArray();

  const elligiblePersons = persons.filter((record) =>
    record.person_data.assignments
      .at(0)
      .values.includes(AssignmentCode.WM_Speaker)
  );

  // add outgoing speakers
  const localCong = congregations.find(
    (record) =>
      record.cong_data.cong_name.value === settings.cong_settings.cong_name
  );

  const speaker1 = structuredClone(vistingSpeakerSchema);
  speaker1.person_uid = elligiblePersons[0].person_uid;
  speaker1._deleted = { value: false, updatedAt: new Date().toISOString() };
  speaker1.speaker_data.cong_id = localCong.id;
  speaker1.speaker_data.talks = [
    {
      _deleted: false,
      talk_number: 6,
      talk_songs: [44, 131],
      updatedAt: new Date().toISOString(),
    },
    {
      _deleted: false,
      talk_number: 26,
      talk_songs: [20, 34, 99],
      updatedAt: new Date().toISOString(),
    },
  ];

  const speaker2 = structuredClone(vistingSpeakerSchema);
  speaker2.person_uid = elligiblePersons[1].person_uid;
  speaker2._deleted = { value: false, updatedAt: new Date().toISOString() };
  speaker2.speaker_data.cong_id = localCong.id;
  speaker2.speaker_data.talks = [
    {
      _deleted: false,
      talk_number: 36,
      talk_songs: [1, 144],
      updatedAt: new Date().toISOString(),
    },
    {
      _deleted: false,
      talk_number: 150,
      talk_songs: [45, 120],
      updatedAt: new Date().toISOString(),
    },
  ];

  await appDb.visiting_speakers.bulkAdd([speaker1, speaker2]);

  // add incoming speakers
  const incomingCongs = congregations.filter(
    (record) =>
      record.cong_data.cong_name.value !== settings.cong_settings.cong_name
  );

  const speaker1Cong1 = structuredClone(vistingSpeakerSchema);
  speaker1Cong1.person_uid = crypto.randomUUID();
  speaker1Cong1._deleted = {
    value: false,
    updatedAt: new Date().toISOString(),
  };
  speaker1Cong1.speaker_data = {
    cong_id: incomingCongs.at(0).id,
    elder: { value: true, updatedAt: new Date().toISOString() },
    ministerial_servant: {
      value: false,
      updatedAt: new Date().toISOString(),
    },
    person_firstname: {
      value: 'Ribeiro',
      updatedAt: new Date().toISOString(),
    },
    person_lastname: {
      value: 'Gonzaga',
      updatedAt: new Date().toISOString(),
    },
    person_display_name: {
      value: generateDisplayName('Gonzaga', 'Ribeiro'),
      updatedAt: new Date().toISOString(),
    },
    person_email: {
      value: 'ribeiro-gonzaga@fakemail.com',
      updatedAt: new Date().toISOString(),
    },
    person_notes: { value: '', updatedAt: new Date().toISOString() },
    person_phone: {
      value: '+61 929-572-140',
      updatedAt: new Date().toISOString(),
    },
    local: { value: false, updatedAt: new Date().toISOString() },
    talks: [
      {
        _deleted: false,
        talk_number: 40,
        talk_songs: [8, 16],
        updatedAt: new Date().toISOString(),
      },
      {
        _deleted: false,
        talk_number: 77,
        talk_songs: [20, 34, 99],
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const speaker2Cong1 = structuredClone(vistingSpeakerSchema);
  speaker2Cong1.person_uid = crypto.randomUUID();
  speaker2Cong1._deleted = {
    value: false,
    updatedAt: new Date().toISOString(),
  };
  speaker2Cong1.speaker_data = {
    cong_id: incomingCongs.at(0).id,
    elder: { value: false, updatedAt: new Date().toISOString() },
    ministerial_servant: { value: true, updatedAt: new Date().toISOString() },
    person_firstname: {
      value: 'Konsta',
      updatedAt: new Date().toISOString(),
    },
    person_lastname: {
      value: 'Manninen',
      updatedAt: new Date().toISOString(),
    },
    person_display_name: {
      value: generateDisplayName('Manninen', 'Konsta'),
      updatedAt: new Date().toISOString(),
    },
    person_email: {
      value: 'konsta-manninen@fakemail.com',
      updatedAt: new Date().toISOString(),
    },
    person_notes: {
      value: 'Note about speaker',
      updatedAt: new Date().toISOString(),
    },
    person_phone: {
      value: '+92 378-326-3439',
      updatedAt: new Date().toISOString(),
    },
    local: { value: false, updatedAt: new Date().toISOString() },
    talks: [
      {
        _deleted: false,
        talk_number: 52,
        talk_songs: [123, 151],
        updatedAt: new Date().toISOString(),
      },
      {
        _deleted: false,
        talk_number: 85,
        talk_songs: [11, 38],
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const speaker1Cong2 = structuredClone(vistingSpeakerSchema);
  speaker1Cong2.person_uid = crypto.randomUUID();
  speaker1Cong2._deleted = {
    value: false,
    updatedAt: new Date().toISOString(),
  };
  speaker1Cong2.speaker_data = {
    cong_id: incomingCongs.at(1).id,
    elder: { value: true, updatedAt: new Date().toISOString() },
    ministerial_servant: {
      value: false,
      updatedAt: new Date().toISOString(),
    },
    person_firstname: {
      value: 'Gary',
      updatedAt: new Date().toISOString(),
    },
    person_lastname: {
      value: 'Simpson',
      updatedAt: new Date().toISOString(),
    },
    person_display_name: {
      value: generateDisplayName('Simpson', 'Gary'),
      updatedAt: new Date().toISOString(),
    },
    person_email: {
      value: 'gary-simpson@fakemail.com',
      updatedAt: new Date().toISOString(),
    },
    person_notes: { value: '', updatedAt: new Date().toISOString() },
    person_phone: {
      value: '+61 929-572-140',
      updatedAt: new Date().toISOString(),
    },
    local: { value: false, updatedAt: new Date().toISOString() },
    talks: [
      {
        _deleted: false,
        talk_number: 40,
        talk_songs: [8, 16],
        updatedAt: new Date().toISOString(),
      },
      {
        _deleted: false,
        talk_number: 77,
        talk_songs: [20, 34, 99],
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const speaker2Cong2 = structuredClone(vistingSpeakerSchema);
  speaker2Cong2.person_uid = crypto.randomUUID();
  speaker2Cong2._deleted = {
    value: false,
    updatedAt: new Date().toISOString(),
  };
  speaker2Cong2.speaker_data = {
    cong_id: incomingCongs.at(1).id,
    elder: { value: false, updatedAt: new Date().toISOString() },
    ministerial_servant: { value: true, updatedAt: new Date().toISOString() },
    person_firstname: {
      value: 'Sylas',
      updatedAt: new Date().toISOString(),
    },
    person_lastname: {
      value: 'Holmes',
      updatedAt: new Date().toISOString(),
    },
    person_display_name: {
      value: generateDisplayName('Holmes', 'Sylas'),
      updatedAt: new Date().toISOString(),
    },
    person_email: {
      value: 'sylas-holmes@fakemail.com',
      updatedAt: new Date().toISOString(),
    },
    person_notes: {
      value: 'Note about speaker',
      updatedAt: new Date().toISOString(),
    },
    person_phone: {
      value: '+92 378-326-3439',
      updatedAt: new Date().toISOString(),
    },
    local: { value: false, updatedAt: new Date().toISOString() },
    talks: [
      {
        _deleted: false,
        talk_number: 52,
        talk_songs: [123, 151],
        updatedAt: new Date().toISOString(),
      },
      {
        _deleted: false,
        talk_number: 85,
        talk_songs: [11, 38],
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  await appDb.visiting_speakers.bulkAdd([
    speaker1Cong1,
    speaker2Cong1,
    speaker1Cong2,
    speaker2Cong2,
  ]);
};

export const dbVisitingSpeakersClear = async () => {
  const records = await appDb.visiting_speakers.toArray();

  if (records.length === 0) return;

  for (const record of records) {
    record._deleted = { value: true, updatedAt: new Date().toISOString() };
  }

  await appDb.visiting_speakers.bulkPut(records);
};

const getObjectLatestUpdate = (obj: object) => {
  let latest = '';

  const traverse = (current: object) => {
    for (const key in current) {
      if (key === 'updatedAt' && typeof current[key] === 'string') {
        if (current[key] > latest) {
          latest = current[key];
        }
      } else if (current[key] !== null && typeof current[key] === 'object') {
        traverse(current[key]);
      }
    }
  };

  traverse(obj);
  return latest;
};

export const dbDeduplicateSpeakers = async () => {
  const speakers = await appDb.visiting_speakers.toArray();
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const groups = new Map<string, VisitingSpeakerType[]>();

  for (const speaker of speakers) {
    if (speaker._deleted.value) continue;

    const firstName = normalize(speaker.speaker_data.person_firstname.value);
    const lastName = normalize(speaker.speaker_data.person_lastname.value);
    const congId = speaker.speaker_data.cong_id;
    const key = `${firstName}|${lastName}|${congId}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(speaker);
  }

  const speakersToUpdate: VisitingSpeakerType[] = [];

  for (const group of groups.values()) {
    if (group.length > 1) {
      group.sort((a, b) => {
        const dateA = getObjectLatestUpdate(a);
        const dateB = getObjectLatestUpdate(b);
        return dateB.localeCompare(dateA);
      });

      for (let i = 1; i < group.length; i++) {
        const speaker = group[i];
        speaker._deleted = { value: true, updatedAt: new Date().toISOString() };
        speakersToUpdate.push(speaker);
      }
    }
  }

  if (speakersToUpdate.length > 0) {
    await appDb.visiting_speakers.bulkPut(speakersToUpdate);
    await dbUpdateVisitingSpeakersMetadata();
  }
};

/**
 * Repara ahora mismo los oradores salientes ya importados cuyo person_uid
 * no corresponde a ninguna Persona real (ver reconcileOutgoingSpeakerLinks).
 * Complementa la reconciliación automática que corre en cada importación —
 * esto es para arreglar de una vez lo que ya quedó desconectado antes de
 * que existiera esa reconciliación.
 */
export const dbVisitingSpeakersReconcileLinks = async () => {
  const speakers = await appDb.visiting_speakers.toArray();
  const persons = await appDb.persons.toArray();
  const congregations = await appDb.speakers_congregations.toArray();
  const settings = await appDb.app_settings.get(1);

  const activePersons = persons.filter((person) => {
    if (person._deleted.value) return false;
    return !(person.person_data.archived?.value ?? false);
  });

  const localCongId = resolveLocalCongId(
    congregations,
    settings?.cong_settings.cong_name ?? '',
    settings?.cong_settings.cong_number.value ?? ''
  );

  const { reconciledUids } = reconcileOutgoingSpeakerLinks(
    speakers.filter((record) => !record._deleted.value),
    activePersons,
    localCongId
  );

  // Solo se corrige el enlace (person_uid) — el nombre denormalizado del
  // orador se deja tal cual lo trae el Sheet. La vista siempre resuelve el
  // nombre en vivo desde la Persona real vía person_uid, así que nunca se
  // muestra; pero el backend sí lo usa al día siguiente para reconocer "es
  // el mismo discursante de ayer" — sobreescribirlo aquí con el nombre
  // abreviado de la app rompía ese reconocimiento y deshacía la
  // reconciliación en el siguiente sync (bug real confirmado 2026-07-06).
  for (const { oldUid, newUid } of reconciledUids) {
    await appDb.visiting_speakers.update(oldUid, {
      person_uid: newUid,
    } as UpdateSpec<VisitingSpeakerType>);
  }

  if (reconciledUids.length > 0) {
    await dbUpdateVisitingSpeakersMetadata();

    // Los programas que ya tenían asignado al orador bajo el uid viejo
    // (en Discursos salientes) se reapuntan al uid real recién enlazado —
    // si no, el catálogo queda arreglado pero esas asignaciones quedan
    // huérfanas.
    const schedules = await appDb.sched.toArray();
    const changedSchedules = remapOutgoingTalkAssignments(schedules, reconciledUids);

    if (changedSchedules.length > 0) {
      await appDb.sched.bulkPut(changedSchedules);
      await dbUpdateSchedulesMetadata();
    }
  }

  return reconciledUids.length;
};

/**
 * Explica por qué un orador saliente sigue sin reconectarse tras pulsar
 * "Reconectar oradores" — sin esto, un caso que no se resuelve solo falla
 * en silencio y no hay forma de saber si es de verdad ambiguo, si ya está
 * enlazado a la persona equivocada, o si su cong_id no coincide.
 */
export const dbVisitingSpeakersDiagnose = async (): Promise<
  SpeakerMatchDiagnostic[]
> => {
  const speakers = await appDb.visiting_speakers.toArray();
  const persons = await appDb.persons.toArray();
  const congregations = await appDb.speakers_congregations.toArray();
  const settings = await appDb.app_settings.get(1);

  const activePersons = persons.filter((person) => {
    if (person._deleted.value) return false;
    return !(person.person_data.archived?.value ?? false);
  });

  const localCongId = resolveLocalCongId(
    congregations,
    settings?.cong_settings.cong_name ?? '',
    settings?.cong_settings.cong_number.value ?? ''
  );

  return diagnoseUnmatchedSpeakers(
    speakers.filter((record) => !record._deleted.value),
    activePersons,
    localCongId
  );
};

export const dbDeduplicateCongregations = async () => {
  const congregations = await appDb.speakers_congregations.toArray();
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const groups = new Map<string, SpeakersCongregationsType[]>();

  for (const cong of congregations) {
    if (cong._deleted.value) continue;

    const name = normalize(cong.cong_data.cong_name.value);
    const number = normalize(cong.cong_data.cong_number.value);
    const key = `${name}|${number}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(cong);
  }

  const congsToUpdate: SpeakersCongregationsType[] = [];

  for (const group of groups.values()) {
    if (group.length > 1) {
      group.sort((a, b) => {
        const dateA = getObjectLatestUpdate(a);
        const dateB = getObjectLatestUpdate(b);
        return dateB.localeCompare(dateA);
      });

      for (let i = 1; i < group.length; i++) {
        const cong = group[i];
        cong._deleted = { value: true, updatedAt: new Date().toISOString() };
        congsToUpdate.push(cong);
      }
    }
  }

  if (congsToUpdate.length > 0) {
    await appDb.speakers_congregations.bulkPut(congsToUpdate);

    const metadata = await appDb.metadata.get(1);
    if (metadata) {
      metadata.metadata.speakers_congregations = {
        ...metadata.metadata.speakers_congregations,
        send_local: true,
      };
      await appDb.metadata.put(metadata);
    }
  }
};
