import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { deptScheduleState, selectedDeptWeekState } from '@states/departments_schedule';
import { dbDeptScheduleSave } from '@services/dexie/departments_schedule';
import { DeptWeekType } from '@definition/departments_schedule';
import { PersonType } from '@definition/person';

const useDepartmentEditor = () => {
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const [schedules, setSchedules] = useAtom(deptScheduleState);

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === selectedWeek);
  }, [schedules, selectedWeek]);

  const handleSaveAssignment = async (
    dept: keyof Omit<DeptWeekType, 'weekOf'>,
    role: string,
    person: PersonType
  ) => {
    const newSchedules = structuredClone(schedules);
    let currentSched = newSchedules.find((s) => s.weekOf === selectedWeek);

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
  };

  return {
    selectedWeek,
    schedule,
    handleSaveAssignment,
  };
};

export default useDepartmentEditor;
