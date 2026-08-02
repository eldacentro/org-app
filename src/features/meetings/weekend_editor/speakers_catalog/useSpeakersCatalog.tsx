import { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { SpeakersCatalogType, TalkOptionType } from './index.types';
import {
  incomingSpeakersState,
  myCongSpeakersState,
} from '@states/visiting_speakers';
import { publicTalksLocaleState } from '@states/public_talks';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import {
  normalizeForSearch,
  personGetDisplayName,
  speakerGetDisplayName,
} from '@utils/common';
import { personsState } from '@states/persons';
import { schedulesSaveAssignment } from '@services/app/schedules';
import {
  outgoingSongSelectorOpenState,
  schedulesState,
  weekendSongSelectorOpenState,
} from '@states/schedules';
import { PublicTalkOptionType } from '../public_talk_selector/index.types';
import usePublicTalkSelector from '../public_talk_selector/usePublicTalkSelector';
import { useAppTranslation } from '@hooks/index';
import { useConfirm } from '@components/confirm_dialog';

const useSpeakersCatalog = ({
  type,
  week,
  onClose,
  schedule_id,
}: SpeakersCatalogType) => {
  const { t } = useAppTranslation();

  const { confirm, ConfirmDialogNode } = useConfirm();

  const { handleTalkChange } = usePublicTalkSelector(week, schedule_id);

  const setLocalSongSelectorOpen = useSetAtom(weekendSongSelectorOpenState);
  const setOutgoingSongSelectorOpen = useSetAtom(outgoingSongSelectorOpenState);

  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const localSpeakers = useAtomValue(myCongSpeakersState);
  const talksData = useAtomValue(publicTalksLocaleState);
  const useDisplayName = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const persons = useAtomValue(personsState);
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);

  const [search, setSearch] = useState('');

  const speakers = useMemo(() => {
    const records: VisitingSpeakerType[] = [];

    if (type === 'localSpeaker') {
      const validSpeakers = localSpeakers.filter(
        (record) =>
          record.speaker_data.talks.filter(
            (record) => record._deleted === false
          ).length > 0
      );

      const formattedSpeakers = validSpeakers.map((speaker) => {
        const person = persons.find(
          (record) => record.person_uid === speaker.person_uid
        );

        const newSpeaker = structuredClone(speaker);

        // Si el enlace con la Persona está roto (p. ej. un discursante
        // importado cuyo person_uid no corresponde a nadie), se conserva el
        // nombre ya denormalizado en el propio registro en vez de reventar
        // el diálogo entero.
        if (person) {
          newSpeaker.speaker_data.person_display_name =
            person.person_data.person_display_name;
          newSpeaker.speaker_data.person_firstname =
            person.person_data.person_firstname;
          newSpeaker.speaker_data.person_lastname =
            person.person_data.person_lastname;
        }

        return newSpeaker;
      });

      records.push(...formattedSpeakers);
    }

    if (type === 'visitingSpeaker') {
      const validSpeakers = incomingSpeakers.filter(
        (record) =>
          record.speaker_data.talks.filter(
            (record) => record._deleted === false
          ).length > 0
      );

      records.push(...validSpeakers);
    }

    return records.sort((a, b) =>
      speakerGetDisplayName(a, useDisplayName, fullnameOption).localeCompare(
        speakerGetDisplayName(b, useDisplayName, fullnameOption)
      )
    );
  }, [
    incomingSpeakers,
    localSpeakers,
    type,
    fullnameOption,
    useDisplayName,
    persons,
  ]);

  const talks = useMemo(() => {
    const options: TalkOptionType[] = [];
    const normalizedSearch = normalizeForSearch(search);

    for (const talk of talksData) {
      const talkSpeakers = speakers.filter(
        (record) =>
          (normalizeForSearch(talk.talk_title).includes(normalizedSearch) ||
            normalizeForSearch(
              record.speaker_data.person_display_name.value
            ).includes(normalizedSearch) ||
            normalizeForSearch(
              record.speaker_data.person_lastname.value
            ).includes(normalizedSearch) ||
            normalizeForSearch(
              record.speaker_data.person_firstname.value
            ).includes(normalizedSearch)) &&
          // Un bosquejo que ya se le quitó (_deleted) no debe seguir
          // apareciendo como si el orador todavía lo tuviera preparado.
          record.speaker_data.talks.find(
            (item) =>
              item.talk_number === talk.talk_number && item._deleted === false
          )
      );

      if (talkSpeakers.length > 0) {
        options.push({
          ...talk,
          speakers: talkSpeakers,
        });
      }
    }

    return options;
  }, [speakers, talksData, search]);

  const handleSearchChange = (value: string) => setSearch(value);

  /**
   * Quién está asignado AHORA en el campo que este catálogo va a rellenar.
   *
   * Son dos campos distintos según de dónde se abra el catálogo: el orador de
   * la reunión de fin de semana (`speaker.part_1`, por vista de datos) o el
   * discursante de una salida de predicación (`outgoing_talks`, por id).
   */
  const assignedSpeakerUid = useMemo(() => {
    const schedule = schedules.find((record) => record.weekOf === week);

    if (!schedule) return '';

    if (schedule_id) {
      const outgoing = schedule.weekend_meeting.outgoing_talks.find(
        (record) => record.id === schedule_id
      );

      return outgoing?.value ?? '';
    }

    return (
      schedule.weekend_meeting.speaker.part_1.find(
        (record) => record.type === dataView
      )?.value ?? ''
    );
  }, [schedules, week, schedule_id, dataView]);

  /**
   * El nombre de un orador a partir de su identificador. Los locales salen de
   * Personas —que es donde el nombre está al día— y los visitantes, de su
   * propio registro, que es el único sitio donde existen.
   */
  const getSpeakerName = (person_uid: string) => {
    const person = persons.find((record) => record.person_uid === person_uid);

    if (person) {
      return personGetDisplayName(person, useDisplayName, fullnameOption);
    }

    const speaker = [...localSpeakers, ...incomingSpeakers].find(
      (record) => record.person_uid === person_uid
    );

    if (speaker) {
      return speakerGetDisplayName(speaker, useDisplayName, fullnameOption);
    }

    return '';
  };

  const handleSelectSpeaker = async (
    talk: TalkOptionType,
    speaker: VisitingSpeakerType
  ) => {
    const schedule = schedules.find((record) => record.weekOf === week);

    // Pulsar un nombre del catálogo ASIGNA, y el catálogo es una lista larga
    // en la que es fácil dar a quien no era. Si el campo ya tiene orador, se
    // pregunta antes de quitarlo diciendo a quién se quita y a quién se pone.
    // Con el campo vacío no hay nada que perder, así que no se molesta.
    if (assignedSpeakerUid && assignedSpeakerUid !== speaker.person_uid) {
      const confirmed = await confirm({
        title: t('tr_replaceSpeakerTitle'),
        message: t('tr_replaceSpeakerDesc', {
          current: getSpeakerName(assignedSpeakerUid),
          next: speakerGetDisplayName(speaker, useDisplayName, fullnameOption),
        }),
        confirmLabel: t('tr_replaceSpeakerConfirm'),
      });

      if (!confirmed) return;
    }

    await handleTalkChange(talk as unknown as PublicTalkOptionType);

    if (!schedule_id) {
      await schedulesSaveAssignment(schedule, 'WM_Speaker_Part1', speaker);

      setLocalSongSelectorOpen(true);
    }

    if (schedule_id) {
      await schedulesSaveAssignment(
        schedule,
        'WM_Speaker_Outgoing',
        speaker,
        schedule_id
      );

      setOutgoingSongSelectorOpen(true);
    }

    onClose();
  };

  return {
    talks,
    count: speakers.length,
    useDisplayName,
    fullnameOption,
    handleSelectSpeaker,
    handleSearchChange,
    search,
    ConfirmDialogNode,
  };
};

export default useSpeakersCatalog;
