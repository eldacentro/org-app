import { useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { IconError } from '@components/icons';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import { personsByViewState } from '@states/persons';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import { FullnameOption } from '@definition/settings';
import {
  outgoingSongSelectorOpenState,
  schedulesState,
} from '@states/schedules';
import { schedulesSaveAssignment } from '@services/app/schedules';
import { outgoingSpeakersState } from '@states/visiting_speakers';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';

const useOutgoingSpeaker = ({
  week,
  assignment,
  talk,
  schedule_id,
}: PersonSelectorType) => {
  const setOutgoingSongSelectorOpen = useSetAtom(outgoingSongSelectorOpenState);

  const persons = useAtomValue(personsByViewState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const schedules = useAtomValue(schedulesState);
  const outgoingSpeakers = useAtomValue(outgoingSpeakersState);

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  // Se calcula antes que `options` para poder incluir siempre al orador ya
  // asignado, aunque el bosquejo se haya cambiado después de asignarlo y ya
  // no aparezca entre los que tienen ese bosquejo preparado — si no, el
  // selector se mostraba vacío pese a tener una asignación real.
  const assignedUid = useMemo(() => {
    if (week.length === 0 || !schedule) return '';

    const outgoingSchedule = schedule.weekend_meeting.outgoing_talks.find(
      (record) => record.id === schedule_id
    );

    return outgoingSchedule?.value ?? '';
  }, [week, schedule, schedule_id]);

  const options = useMemo(() => {
    const result: PersonOptionsType[] = [];

    for (const speaker of outgoingSpeakers) {
      // If a talk filter is set, only include speakers who have that talk
      // prepared — salvo el ya asignado, que siempre se muestra.
      if (talk !== undefined && talk !== null && speaker.person_uid !== assignedUid) {
        const hasTalk = speaker.speaker_data.talks.some(
          (record) =>
            record._deleted === false &&
            Number(record.talk_number) === Number(talk)
        );
        if (!hasTalk) continue;
      }

      // Try to find a matching person in the congregation persons list
      // (for speakers who are also registered as persons)
      const person = persons.find(
        (record) => record.person_uid === speaker.person_uid
      );

      // Build name from person record if available, otherwise from speaker_data
      const firstname = person?.person_data.person_firstname.value
        ?? speaker.speaker_data.person_firstname.value
        ?? '';
      const lastname = person?.person_data.person_lastname.value
        ?? speaker.speaker_data.person_lastname.value
        ?? '';

      const person_name = displayNameEnabled
        ? speaker.speaker_data.person_display_name.value ||
          `${firstname} ${lastname}`.trim()
        : fullnameOption === FullnameOption.FIRST_BEFORE_LAST
          ? `${firstname} ${lastname}`.trim()
          : `${lastname} ${firstname}`.trim();

      result.push({
        person_uid: speaker.person_uid,
        person_name: person_name || speaker.person_uid,
        // Spread person record if found, otherwise provide minimal shape
        ...(person ?? {
          person_uid: speaker.person_uid,
          person_data: {
            person_firstname: speaker.speaker_data.person_firstname,
            person_lastname: speaker.speaker_data.person_lastname,
            person_display_name: speaker.speaker_data.person_display_name,
          },
        }),
      } as PersonOptionsType);
    }

    return result.sort((a, b) =>
      (a.person_name ?? '').localeCompare(b.person_name ?? '')
    );
  }, [persons, displayNameEnabled, fullnameOption, talk, outgoingSpeakers, assignedUid]);

  const value = useMemo(() => {
    if (week.length === 0) return null;

    const outgoingSchedule = schedule.weekend_meeting.outgoing_talks.find(
      (record) => record.id === schedule_id
    );

    if (!outgoingSchedule || outgoingSchedule?.value?.length === 0) {
      return null;
    }

    const person = options.find(
      (record) => record.person_uid === outgoingSchedule.value
    );

    return person || null;
  }, [week, schedule, options, schedule_id]);

  const handleSaveAssignment = async (value: PersonOptionsType) => {
    try {
      await schedulesSaveAssignment(schedule, assignment, value, schedule_id);

      if (assignment === 'WM_Speaker_Outgoing') {
        setOutgoingSongSelectorOpen(true);
      }
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    }
  };

  return {
    options,
    handleSaveAssignment,
    value,
  };
};

export default useOutgoingSpeaker;
