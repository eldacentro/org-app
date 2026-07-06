import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { SpeakersCongregationsType } from '@definition/speakers_congregations';
import { PersonType } from '@definition/person';

// Módulo sin dependencias de Jotai/estado de React a propósito: lo importa
// tanto el hilo principal (importación manual) como el web worker de
// sincronización (restauración automática diaria) — un worker no comparte
// el store de la pestaña, así que este archivo no puede depender de él.

const normalizeForMatch = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Resuelve el id de "mi congregación" dentro de la tabla speakers_congregations
 * — misma lógica de emparejamiento (nombre normalizado o número) que usa
 * myCongSpeakersState/incomingSpeakersState, extraída aquí para que el código
 * que corre fuera de React (servicios de importación/reconciliación) pueda
 * resolverla sin duplicar la comparación.
 */
export const resolveLocalCongId = (
  congregations: SpeakersCongregationsType[],
  congName: string,
  congNumber: string
): string | undefined => {
  const normalizedHomeName = normalizeForMatch(congName);

  const localCong = congregations.find((record) => {
    if (!record.cong_data) return false;

    const nameVal =
      typeof record.cong_data.cong_name === 'object'
        ? record.cong_data.cong_name?.value
        : record.cong_data.cong_name;
    const numVal =
      typeof record.cong_data.cong_number === 'object'
        ? record.cong_data.cong_number?.value
        : record.cong_data.cong_number;

    const recordName = normalizeForMatch(String(nameVal ?? ''));
    const recordNumber = String(numVal || '').trim();

    return (
      (recordName !== '' && recordName === normalizedHomeName) ||
      (recordNumber !== '' && recordNumber === congNumber)
    );
  });

  return localCong?.id;
};

/**
 * Busca la Persona real cuyo nombre coincide exactamente (normalizado) con
 * el nombre denormalizado guardado en el registro de orador. Solo devuelve
 * una coincidencia cuando es única — con nombre y apellido repetidos, o sin
 * ninguna coincidencia, no arriesga a enlazar con la persona equivocada.
 */
const matchSpeakerToPerson = (
  speaker: VisitingSpeakerType,
  persons: PersonType[]
): PersonType | null => {
  const speakerName = normalizeForMatch(
    `${speaker.speaker_data.person_firstname.value}${speaker.speaker_data.person_lastname.value}`
  );

  if (!speakerName) return null;

  const matches = persons.filter((person) => {
    const personName = normalizeForMatch(
      `${person.person_data.person_firstname.value}${person.person_data.person_lastname.value}`
    );

    return personName === speakerName;
  });

  return matches.length === 1 ? matches[0] : null;
};

export type SpeakerReconcileResult = {
  speakers: VisitingSpeakerType[];
  reconciledUids: { oldUid: string; newUid: string }[];
};

/**
 * Repara el enlace de los oradores salientes (nuestros propios publicadores)
 * cuyo person_uid no corresponde a ninguna Persona real de la congregación
 * — típico de una importación externa (p. ej. la hoja de cálculo del
 * circuito) que genera su propio identificador por no conocer el interno de
 * la app. Cuando encuentra una única coincidencia exacta de nombre, sustituye
 * el person_uid por el real; si no encuentra ninguna o hay varias posibles,
 * deja el registro tal cual para que se resuelva a mano.
 *
 * No toca a los oradores visitantes (de otras congregaciones): para esos no
 * existe una Persona local que enlazar, y buscar por nombre ahí sería
 * arriesgado (podría coincidir por casualidad con alguien de la congregación
 * que no tiene nada que ver).
 *
 * IMPORTANTE: `localCongId` es obligatorio y se comprueba explícitamente —
 * sin él, un discursante del circuito con el mismo nombre que un publicador
 * de ESTA congregación se reconectaría por error con la Persona local
 * (confirmado como bug real; ver auditoría de Discursos). Si no se puede
 * resolver el id de la propia congregación, no se reconcilia nada.
 */
export const reconcileOutgoingSpeakerLinks = (
  speakers: VisitingSpeakerType[],
  persons: PersonType[],
  localCongId: string | undefined
): SpeakerReconcileResult => {
  if (!localCongId) return { speakers, reconciledUids: [] };

  const activePersonUids = new Set(persons.map((p) => p.person_uid));

  const usedUids = new Set(
    speakers
      .filter((s) => activePersonUids.has(s.person_uid))
      .map((s) => s.person_uid)
  );

  const reconciledUids: { oldUid: string; newUid: string }[] = [];

  const result = speakers.map((speaker) => {
    if (speaker.speaker_data.local.value) return speaker;
    if (speaker.speaker_data.cong_id !== localCongId) return speaker;
    if (activePersonUids.has(speaker.person_uid)) return speaker;

    const matchedPerson = matchSpeakerToPerson(speaker, persons);

    if (!matchedPerson || usedUids.has(matchedPerson.person_uid)) {
      return speaker;
    }

    usedUids.add(matchedPerson.person_uid);
    reconciledUids.push({
      oldUid: speaker.person_uid,
      newUid: matchedPerson.person_uid,
    });

    return {
      ...speaker,
      person_uid: matchedPerson.person_uid,
      speaker_data: {
        ...speaker.speaker_data,
        person_firstname: {
          value: matchedPerson.person_data.person_firstname.value,
          updatedAt: new Date().toISOString(),
        },
        person_lastname: {
          value: matchedPerson.person_data.person_lastname.value,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  });

  return { speakers: result, reconciledUids };
};
