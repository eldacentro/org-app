import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { PersonComponentProps, PersonDataType } from './index.types';
import { schedulesState } from '@states/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import { schedulesGetData } from '@services/app/schedules';
import {
  congNameState,
  CODisplayNameState,
  COFullnameState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  settingsState,
  userLocalUIDState,
} from '@states/settings';
import { AssignmentCongregation } from '@definition/schedules';
import { personsState } from '@states/persons';
import { personGetDisplayName, speakerGetDisplayName } from '@utils/common';
import { incomingSpeakersState, visitingSpeakersState } from '@states/visiting_speakers';
import { speakersCongregationsActiveState } from '@states/speakers_congregations';

const usePersonComponent = ({
  week,
  assignment,
  schedule_id,
  dataView,
}: PersonComponentProps) => {
  const { t } = useAppTranslation();
  const schedules = useAtomValue(schedulesState);
  const persons = useAtomValue(personsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);
  const coDisplayName = useAtomValue(CODisplayNameState);
  const coFullname = useAtomValue(COFullnameState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const visitingSpeakers = useAtomValue(visitingSpeakersState);
  const settings = useAtomValue(settingsState);
  const congName = useAtomValue(congNameState);
  const congregations = useAtomValue(speakersCongregationsActiveState);

  const mmAuxCounselorDefaultEnabled = useMemo(() => {
    return (
      settings.cong_settings.midweek_meeting.find(
        (record) => record.type === dataView
      )?.aux_class_counselor_default.enabled.value ?? false
    );
  }, [settings, dataView]);

  const mmAuxCounselorDefault = useMemo(() => {
    return (
      settings.cong_settings.midweek_meeting.find(
        (record) => record.type === dataView
      )?.aux_class_counselor_default.person.value ?? ''
    );
  }, [settings, dataView]);

  const wsConductor = useMemo(() => {
    return (
      settings.cong_settings.weekend_meeting.find(
        (record) => record.type === dataView
      )?.w_study_conductor_default.value ?? ''
    );
  }, [settings, dataView]);

  const personData = useMemo(() => {
    const result: PersonDataType = {
      name: undefined,
      active: undefined,
      female: undefined,
      congregation: undefined,
    };

    const schedule = schedules.find((record) => record.weekOf === week);

    if (!schedule) return result;

    if (!schedule_id) {
      const path = ASSIGNMENT_PATH[assignment];

      const assigned = schedulesGetData(
        schedule,
        path,
        dataView
      ) as AssignmentCongregation;

      // circuit overseer field
      if (
        (assignment === 'MM_CircuitOverseer' ||
          assignment === 'WM_CircuitOverseer') &&
        assigned?.value?.length === 0
      ) {
        return {
          name: displayNameEnabled ? coDisplayName : coFullname,
          female: false,
          active: false,
        };
      }

      // return immediately if solo value
      if (assigned?.solo) {
        return {
          name: assigned.value,
          female: false,
          active: false,
        };
      }

      // talkType is needed for WM_ClosingPrayer fallback logic below
      const talkType = schedule.weekend_meeting?.public_talk_type.find(
        (record) => record.type === dataView
      );

      const person = persons.find(
        (record) => record.person_uid === assigned?.value
      );

      if (person) {
        result.name = personGetDisplayName(
          person,
          displayNameEnabled,
          fullnameOption
        );
        result.female = person.person_data.female.value;
        result.active = assigned.value === userUID;
        
        if (props.showCongregation) {
          result.congregation = congName;
        }
      }

      // Fallback: check incomingSpeakers when not found in local persons.
      // Covers visitingSpeaker talk type and cases where talkType is missing
      // or out of sync with the stored speaker UID (e.g. after a talk-type change).
      if (!result.name && assigned?.value?.length > 0) {
        const speaker = incomingSpeakers.find(
          (record) => record.person_uid === assigned?.value
        );

        if (speaker) {
          result.name = speakerGetDisplayName(
            speaker,
            displayNameEnabled,
            fullnameOption
          );
          result.female = false;
          result.active = false;

          if (props.showCongregation) {
            const speakerCong = congregations.find(c => c.id === speaker.speaker_data.cong_id);
            const congNameVal = typeof speakerCong?.cong_data?.cong_name === 'object' 
              ? speakerCong.cong_data.cong_name.value 
              : speakerCong?.cong_data?.cong_name;
            result.congregation = (congNameVal as string) || undefined;
          }
        }
      }

      // Final fallback: use the denormalized name baked into the assignment.
      // This is what lets schedule viewers (e.g. plain publishers) who don't
      // sync the visiting_speakers table still see visiting speaker names.
      if (!result.name && assigned?.value?.length > 0 && assigned?.name) {
        result.name = assigned.name;
        result.female = false;
        result.active = assigned.value === userUID;
      }

      // get default values for some field if blank
      if (
        assignment === 'MM_Chairman_B' &&
        !result?.name &&
        mmAuxCounselorDefaultEnabled
      ) {
        const person = persons.find(
          (record) => record.person_uid === mmAuxCounselorDefault
        );

        if (person) {
          result.name = personGetDisplayName(
            person,
            displayNameEnabled,
            fullnameOption
          );
          result.female = false;
          result.active = assigned.value === userUID;
        }
      }

      if (assignment === 'WM_WTStudy_Conductor' && !result?.name) {
        const person = persons.find(
          (record) => record.person_uid === wsConductor
        );

        if (person) {
          result.name = personGetDisplayName(
            person,
            displayNameEnabled,
            fullnameOption
          );

          result.female = false;
          result.active = assigned?.value === userUID;
        }
      }

      if (assignment === 'WM_ClosingPrayer') {
        const speakerPath = ASSIGNMENT_PATH['WM_Speaker_Part1'];
        const speakerAssigned = schedulesGetData(
          schedule,
          speakerPath,
          dataView
        ) as AssignmentCongregation;

        const coPath = ASSIGNMENT_PATH['WM_CircuitOverseer'];
        const coAssigned = schedulesGetData(
          schedule,
          coPath,
          dataView
        ) as AssignmentCongregation;

        const isSpeaker =
          assigned?.value?.length > 0 &&
          assigned?.value === speakerAssigned?.value;

        // Determine if the public-talk speaker is an incoming (visiting) speaker,
        // either by explicit talkType or by UID presence in incomingSpeakers.
        const speakerIsVisiting =
          talkType?.value === 'visitingSpeaker' ||
          incomingSpeakers.some(
            (s) => s.person_uid === speakerAssigned?.value
          );

        if (isSpeaker && result.name && speakerIsVisiting) {
          result.name = `${result.name} ${t('tr_orWatchtowerStudyReader')}`;
        }

        if (!result?.name) {
          if (!speakerIsVisiting) {
            const person = persons.find(
              (record) => record.person_uid === speakerAssigned?.value
            );

            if (person) {
              result.name = personGetDisplayName(
                person,
                displayNameEnabled,
                fullnameOption
              );

              result.female = false;
              result.active = speakerAssigned?.value === userUID;
            }

            if (!person) {
              const coPerson = persons.find(
                (record) => record.person_uid === coAssigned?.value
              );

              if (coPerson) {
                result.name = personGetDisplayName(
                  coPerson,
                  displayNameEnabled,
                  fullnameOption
                );

                result.female = false;
                result.active = coAssigned?.value === userUID;
              }

              if (!coPerson && coAssigned?.value === '') {
                result.name = displayNameEnabled ? coDisplayName : coFullname;
                result.female = false;
                result.active = false;
              }
            }
          }

          if (speakerIsVisiting) {
            const speaker = incomingSpeakers.find(
              (record) => record.person_uid === speakerAssigned?.value
            );

            if (speaker) {
              result.name = `${speakerGetDisplayName(
                speaker,
                displayNameEnabled,
                fullnameOption
              )} ${t('tr_orWatchtowerStudyReader')}`;
              result.female = false;
              result.active = false;
            } else if (speakerAssigned?.name) {
              // Fallback to the denormalized name baked into the assignment.
              result.name = `${speakerAssigned.name} ${t('tr_orWatchtowerStudyReader')}`;
              result.female = false;
              result.active = false;
            }
          }
        }
      }
    }

    if (schedule_id) {
      const talkSchedule = schedule.weekend_meeting?.outgoing_talks.find(
        (record) => record.id === schedule_id && !record._deleted
      );

      const person = persons.find(
        (record) => record.person_uid === talkSchedule?.value
      );

      const speaker = visitingSpeakers.find(
        (record) => record.person_uid === talkSchedule?.value
      );

      if (person) {
        result.name = personGetDisplayName(
          person,
          displayNameEnabled,
          fullnameOption
        );

        result.female = person.person_data.female.value;
        result.active = talkSchedule.value === userUID;
      } else if (speaker) {
        result.name = speakerGetDisplayName(
          speaker,
          displayNameEnabled,
          fullnameOption
        );

        result.female = false;
        result.active = talkSchedule.value === userUID;
      }
    }

    return result;
  }, [
    dataView,
    assignment,
    schedules,
    week,
    displayNameEnabled,
    fullnameOption,
    persons,
    userUID,
    coDisplayName,
    coFullname,
    wsConductor,
    incomingSpeakers,
    visitingSpeakers,
    mmAuxCounselorDefaultEnabled,
    mmAuxCounselorDefault,
    schedule_id,
    t,
  ]);

  return { personData };
};

export default usePersonComponent;
