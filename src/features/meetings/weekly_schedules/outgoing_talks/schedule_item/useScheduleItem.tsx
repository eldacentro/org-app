import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { ScheduleItemProps, TalkScheduleType } from './index.types';
import { personsState } from '@states/persons';
import { publicTalksLocaleState } from '@states/public_talks';
import { personGetDisplayName, speakerGetDisplayName } from '@utils/common';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import { visitingSpeakersState } from '@states/visiting_speakers';

const useScheduleItem = ({ schedule }: ScheduleItemProps) => {
  const persons = useAtomValue(personsState);
  const visitingSpeakers = useAtomValue(visitingSpeakersState);
  const talks = useAtomValue(publicTalksLocaleState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const talkSchedule: TalkScheduleType = useMemo(() => {
    const person = persons.find(
      (record) => record.person_uid === schedule.speaker
    );

    const speaker = visitingSpeakers.find(
      (record) => record.person_uid === schedule.speaker
    );

    const talk = talks.find((record) => record.talk_number === schedule.talk);

    let speakerName = '';
    if (person) {
      speakerName = personGetDisplayName(person, displayNameEnabled, fullnameOption);
    } else if (speaker) {
      speakerName = speakerGetDisplayName(speaker, displayNameEnabled, fullnameOption);
    }

    return {
      ...schedule,
      name: speakerName,
      talk_title: talk?.talk_title,
    };
  }, [schedule, persons, visitingSpeakers, talks, displayNameEnabled, fullnameOption]);

  return { talkSchedule };
};

export default useScheduleItem;
