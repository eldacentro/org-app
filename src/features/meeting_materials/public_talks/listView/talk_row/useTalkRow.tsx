import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { TalkItemType } from '../../index.types';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import { personsAllState } from '@states/persons';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  congNumberState,
  congNameState,
} from '@states/settings';
import { speakersCongregationsActiveState } from '@states/speakers_congregations';
import { personGetDisplayName, speakerGetDisplayName } from '@utils/common';

const useTalkRow = (defaultExpand: boolean, talk: TalkItemType) => {
  const [collapseOpen, setCollapseOpen] = useState(defaultExpand);
  const [isHistoryFocused, setIsHistoryFocused] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<VisitingSpeakerType | null>(null);

  const speakers = useAtomValue(visitingSpeakersActiveState);
  const persons = useAtomValue(personsAllState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const congregations = useAtomValue(speakersCongregationsActiveState);
  const congNumber = useAtomValue(congNumberState);
  const congName = useAtomValue(congNameState);

  const handleToggleCollapse = () => {
    setCollapseOpen((prev) => !prev);
  };

  const handleHistoryFocused = () => {
    setIsHistoryFocused(true);
  };

  const handleHistoryUnfocused = () => {
    setIsHistoryFocused(false);
  };

  const handleOpenDetails = (speaker: VisitingSpeakerType) => {
    setSelectedSpeaker(speaker);
  };

  const handleCloseDetails = () => {
    setSelectedSpeaker(null);
  };

  useEffect(() => {
    setCollapseOpen(defaultExpand);
  }, [defaultExpand]);

  const speakersWithTalk = useMemo(() => {
    const matchingSpeakers = speakers.filter((speaker) => {
      return speaker.speaker_data.talks.some(
        (t) => t._deleted === false && t.talk_number === talk.talk_number
      );
    });

    const formatted = matchingSpeakers.map((speaker) => {
      let displayName = '';
      if (speaker.speaker_data.local.value) {
        const findPerson = persons.find(
          (p) => p.person_uid === speaker.person_uid
        );
        if (findPerson) {
          displayName = personGetDisplayName(
            findPerson,
            displayNameEnabled,
            fullnameOption
          );
        }
      }

      if (!displayName) {
        displayName = speakerGetDisplayName(
          speaker,
          displayNameEnabled,
          fullnameOption
        );
      }

      const localId = congregations.find(
        (c) => c.cong_data.cong_number.value === congNumber
      )?.id;

      const speakerCongName =
        localId === speaker.speaker_data.cong_id
          ? congName
          : congregations.find(
              (c) => c.id === speaker.speaker_data.cong_id
            )?.cong_data.cong_name.value || '';

      return {
        speaker,
        name: displayName,
        congregation: speakerCongName,
      };
    });

    return formatted.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    talk.talk_number,
    speakers,
    persons,
    displayNameEnabled,
    fullnameOption,
    congregations,
    congNumber,
    congName,
  ]);

  return {
    collapseOpen,
    handleToggleCollapse,
    isHistoryFocused,
    handleHistoryFocused,
    handleHistoryUnfocused,
    speakersWithTalk,
    selectedSpeaker,
    handleOpenDetails,
    handleCloseDetails,
  };
};

export default useTalkRow;
