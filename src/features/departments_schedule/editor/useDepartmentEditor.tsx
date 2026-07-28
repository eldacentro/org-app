import { useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { deptScheduleState, selectedDeptWeekState } from '@states/departments_schedule';
import { dbDeptScheduleSave } from '@services/dexie/departments_schedule';
import {
  ALL_DEPARTMENT_TYPES,
  DepartmentType,
  PersonType,
} from '@definition/person';
import worker from '@services/worker/backupWorker';
import {
  schedulesGetMeetingDate,
  schedulesWeekHasNoMeetingAtAll,
} from '@services/app/schedules';
import {
  departmentsConfigState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
  userDataViewState,
} from '@states/settings';
import { schedulesState } from '@states/schedules';
import { personGetDisplayName } from '@utils/common';
import { useAppTranslation } from '@hooks/index';
import { monthNamesState } from '@states/app';
import { buildWeekRangeLabel } from '@services/app/week_range';
import { readDeptConfig } from '@services/app/departments_slots';

const useDepartmentEditor = () => {
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const dataView = useAtomValue(userDataViewState);
  const [schedules, setSchedules] = useAtom(deptScheduleState);
  const meetingSchedules = useAtomValue(schedulesState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const departmentsConfig = useAtomValue(departmentsConfigState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const monthNames = useAtomValue(monthNamesState);
  const { t } = useAppTranslation();

  const [clearAll, setClearAll] = useState(false);

  const schedule = useMemo(() => {
    return schedules.find((record) => record?.weekOf === selectedWeek);
  }, [schedules, selectedWeek]);

  const isNoMeetingWeek = useMemo(() => {
    if (!selectedWeek) return false;
    return schedulesWeekHasNoMeetingAtAll(selectedWeek, meetingSchedules);
  }, [selectedWeek, meetingSchedules]);

  // `role` es ahora la CLAVE del puesto que da departments_slots: 'exterior',
  // 'exterior__midweek', 'exterior__t2'… El resto del guardado no cambia.
  const handleSaveAssignment = async (
    dept: DepartmentType,
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
      name: person
        ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
        : '',
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

      // Se vacía TODO lo que haya guardado, no solo los puestos que la
      // configuración de hoy enseña: si alguien cambió de "por reunión" a "por
      // semana", las claves antiguas siguen ahí y hay que limpiarlas también.
      for (const dept of ALL_DEPARTMENT_TYPES) {
        for (const key of Object.keys(currentSched[dept] ?? {})) {
          currentSched[dept][key] = { value: '', updatedAt };
        }
      }

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

  // El encabezado decía la fecha de la reunión de ENTRE SEMANA (miércoles 5),
  // no la de la semana (lunes 3), y eso se lee mal en las dos configuraciones:
  // por semana parecía que solo era el miércoles, y por reunión parecía que
  // toda la página era la de entre semana. Ahora dice la semana, que es lo que
  // esta página organiza siempre.
  const weekName = useMemo(
    () => buildWeekRangeLabel(selectedWeek, monthNames, t),
    [selectedWeek, monthNames, t]
  );

  // Y cuando algún departamento se asigna POR REUNIÓN, se dicen los dos días
  // concretos: si no, "Entre semana" y "Fin de semana" en cada puesto obligan
  // a mirar el calendario para saber de qué día se está hablando.
  const meetingDaysName = useMemo(() => {
    if (!selectedWeek) return '';

    const anyByMeeting = ALL_DEPARTMENT_TYPES.some(
      (dept) => readDeptConfig(departmentsConfig, dept).scope === 'meeting'
    );

    if (!anyByMeeting) return '';

    const midweek = schedulesGetMeetingDate({
      week: selectedWeek,
      meeting: 'midweek',
      dataView,
    });

    const weekend = schedulesGetMeetingDate({
      week: selectedWeek,
      meeting: 'weekend',
      dataView,
    });

    if (!midweek.locale || !weekend.locale) return '';

    return `Entre semana: ${midweek.locale} · Fin de semana: ${weekend.locale}`;
  }, [selectedWeek, dataView, departmentsConfig]);

  return {
    selectedWeek,
    schedule,
    departmentsConfig,
    handleSaveAssignment,
    clearAll,
    handleOpenClearAll,
    handleCloseClearAll,
    handleClearAll,
    weekName,
    meetingDaysName,
    isNoMeetingWeek,
  };
};

export default useDepartmentEditor;
