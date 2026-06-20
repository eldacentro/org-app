import { useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { deptScheduleState, selectedDeptWeekState } from '@states/departments_schedule';
import { dbDeptScheduleSave } from '@services/dexie/departments_schedule';
import { DeptWeekType } from '@definition/departments_schedule';
import { PersonType } from '@definition/person';
import worker from '@services/worker/backupWorker';
import {
  schedulesGetMeetingDate,
  schedulesWeekHasNoMeetingAtAll,
} from '@services/app/schedules';
import { userDataViewState } from '@states/settings';
import { schedulesState } from '@states/schedules';

const useDepartmentEditor = () => {
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const dataView = useAtomValue(userDataViewState);
  const [schedules, setSchedules] = useAtom(deptScheduleState);
  const meetingSchedules = useAtomValue(schedulesState);

  const [clearAll, setClearAll] = useState(false);

  const schedule = useMemo(() => {
    return schedules.find((record) => record?.weekOf === selectedWeek);
  }, [schedules, selectedWeek]);

  const isNoMeetingWeek = useMemo(() => {
    if (!selectedWeek) return false;
    return schedulesWeekHasNoMeetingAtAll(selectedWeek, meetingSchedules);
  }, [selectedWeek, meetingSchedules]);

  const handleSaveAssignment = async (
    dept: keyof Omit<DeptWeekType, 'weekOf'>,
    role: string,
    person: PersonType
  ) => {
    const newSchedules = structuredClone(schedules);
    let currentSched = newSchedules.find((s) => s?.weekOf === selectedWeek);

    if (!currentSched) {
      currentSched = {
        weekOf: selectedWeek,
        acomodadores: {
          exterior: { value: '', updatedAt: '' },
          interior: { value: '', updatedAt: '' },
        },
        microfonos: {
          micro1: { value: '', updatedAt: '' },
          micro2: { value: '', updatedAt: '' },
        },
        multimedia: {
          video: { value: '', updatedAt: '' },
          audio: { value: '', updatedAt: '' },
        },
        plataforma: { encargado: { value: '', updatedAt: '' } },
      };
      newSchedules.push(currentSched);
    }

    currentSched[dept][role] = {
      value: person?.person_uid || '',
      updatedAt: new Date().toISOString(),
    };

    setSchedules(newSchedules);
    await dbDeptScheduleSave(currentSched);
    worker.postMessage('startWorker');
  };

  const handleOpenClearAll = () => setClearAll(true);
  const handleCloseClearAll = () => setClearAll(false);

  const handleClearAll = async () => {
    const newSchedules = structuredClone(schedules);
    const currentSched = newSchedules.find((s) => s?.weekOf === selectedWeek);

    if (currentSched) {
      const updatedAt = new Date().toISOString();
      currentSched.acomodadores = {
        exterior: { value: '', updatedAt },
        interior: { value: '', updatedAt },
      };
      currentSched.microfonos = {
        micro1: { value: '', updatedAt },
        micro2: { value: '', updatedAt },
      };
      currentSched.multimedia = {
        video: { value: '', updatedAt },
        audio: { value: '', updatedAt },
      };
      currentSched.plataforma = {
        encargado: { value: '', updatedAt },
      };

      try {
        setSchedules(newSchedules);
        await dbDeptScheduleSave(currentSched);
        worker.postMessage('startWorker');
      } catch (err) {
        console.error('Error clearing schedule:', err);
        // Revertir el cambio en el estado si falla el guardado
        setSchedules(schedules);
      }
    }
    setClearAll(false);
  };

  const weekName = useMemo(() => {
    if (!selectedWeek) return '';

    const meetingDate = schedulesGetMeetingDate({
      week: selectedWeek,
      meeting: 'midweek',
      forPrint: true,
      dataView,
    });

    return meetingDate.locale;
  }, [selectedWeek, dataView]);

  return {
    selectedWeek,
    schedule,
    handleSaveAssignment,
    clearAll,
    handleOpenClearAll,
    handleCloseClearAll,
    handleClearAll,
    weekName,
    isNoMeetingWeek,
  };
};

export default useDepartmentEditor;
