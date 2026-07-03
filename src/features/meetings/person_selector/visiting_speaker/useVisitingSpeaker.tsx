import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { IconError } from '@components/icons';
import { PersonOptionsType, PersonSelectorType } from '../index.types';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import {
  schedulesState,
  weekendSongSelectorOpenState,
} from '@states/schedules';
import { personGetDisplayName } from '@utils/common';
import {
  schedulesGetData,
  schedulesSaveAssignment,
} from '@services/app/schedules';
import { incomingSpeakersState } from '@states/visiting_speakers';
import { personSchema } from '@services/dexie/schema';
import { ASSIGNMENT_PATH } from '@constants/index';
import { AssignmentCongregation } from '@definition/schedules';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';

const useVisitingSpeaker = ({ week, assignment, talk }: PersonSelectorType) => {
  const timerSource = useRef<NodeJS.Timeout>(undefined);
  // Mientras el guardado está en curso, `schedule` (y por lo tanto
  // `defaultValue`/`value`) todavía no refleja la selección recién hecha —
  // el guardado escribe a Dexie y el estado tarda un instante en
  // alcanzarlo. Sin este flag, el useEffect de abajo ve `value` como
  // "vacío" en ese instante y sobreescribe el texto que el usuario acaba
  // de seleccionar, como si lo hubiera deseleccionado.
  const isSavingRef = useRef(false);

  const setLocalSongSelectorOpen = useSetAtom(weekendSongSelectorOpenState);

  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const schedules = useAtomValue(schedulesState);
  const incomingSpeakers = useAtomValue(incomingSpeakersState);
  const dataView = useAtomValue(userDataViewState);

  const [inputValue, setInputValue] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  const options = useMemo(() => {
    const filteredPersons: PersonOptionsType[] = [];

    for (const speaker of incomingSpeakers) {
      if (talk) {
        const activeTalks = speaker.speaker_data.talks.filter(
          (record) => record._deleted === false && record.talk_number === talk
        );

        if (activeTalks.length === 0) {
          continue;
        }
      }

      const person: PersonOptionsType = structuredClone(personSchema);

      person.person_uid = speaker.person_uid;
      person.person_data.person_lastname.value =
        speaker.speaker_data.person_lastname.value;
      person.person_data.person_firstname.value =
        speaker.speaker_data.person_firstname.value;
      person.person_data.person_display_name.value =
        speaker.speaker_data.person_display_name.value;
      person.person_data.male.value = true;

      filteredPersons.push(person);
    }

    const newPersons = filteredPersons.map((record) => {
      return {
        ...record,
        person_name: personGetDisplayName(
          record,
          displayNameEnabled,
          fullnameOption
        ),
      };
    });

    return newPersons.sort((a, b) =>
      a.person_name.localeCompare(b.person_name)
    );
  }, [displayNameEnabled, fullnameOption, talk, incomingSpeakers]);

  const defaultValue = useMemo(() => {
    if (week.length === 0) return null;

    const path = ASSIGNMENT_PATH[assignment];

    if (!path) return null;

    const dataSchedule = schedulesGetData(schedule, path);
    let assigned: AssignmentCongregation;

    if (Array.isArray(dataSchedule)) {
      assigned = dataSchedule.find((record) => record.type === dataView);
    } else {
      assigned = dataSchedule;
    }

    return assigned?.value;
  }, [week, schedule, dataView, assignment]);

  const value = useMemo(() => {
    const person = options.find((record) => record.person_uid === defaultValue);

    return person || null;
  }, [defaultValue, options]);

  const handleSaveAssignment = async (value: PersonOptionsType) => {
    isSavingRef.current = true;

    try {
      await schedulesSaveAssignment(schedule, assignment, value);

      if (assignment === 'WM_Speaker_Part1') {
        setLocalSongSelectorOpen(true);
      }
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
  const handleCloseQuickAdd = () => setIsQuickAddOpen(false);

  // Mismo shape que las opciones de la lista (construidas más arriba desde
  // incomingSpeakers) — así el recién creado queda vinculado de verdad al
  // catálogo (guarda su person_uid), no como texto libre.
  const handleSpeakerCreated = (speaker: VisitingSpeakerType) => {
    const person: PersonOptionsType = structuredClone(personSchema);

    person.person_uid = speaker.person_uid;
    person.person_data.person_lastname.value =
      speaker.speaker_data.person_lastname.value;
    person.person_data.person_firstname.value =
      speaker.speaker_data.person_firstname.value;
    person.person_data.person_display_name.value =
      speaker.speaker_data.person_display_name.value;
    person.person_data.male.value = true;
    person.person_name = personGetDisplayName(
      person,
      displayNameEnabled,
      fullnameOption
    );

    handleSaveAssignment(person);
  };

  const handleValueChange = async (text: string) => {
    setInputValue(text);

    try {
      if (text.length === 0) {
        await schedulesSaveAssignment(schedule, assignment, '');
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

  const handleValueSave = () => {
    if (timerSource.current) clearTimeout(timerSource.current);

    timerSource.current = setTimeout(handleValueSaveDb, 1000);
  };

  const handleValueSaveDb = async () => {
    try {
      await schedulesSaveAssignment(schedule, assignment, inputValue);
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

  useEffect(() => {
    if (!value && !isSavingRef.current) {
      setInputValue(defaultValue || '');
    }
  }, [defaultValue, value]);

  return {
    options,
    handleSaveAssignment,
    value,
    inputValue,
    handleValueChange,
    handleValueSave,
    isQuickAddOpen,
    handleOpenQuickAdd,
    handleCloseQuickAdd,
    handleSpeakerCreated,
  };
};

export default useVisitingSpeaker;
