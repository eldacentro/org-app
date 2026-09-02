import { store } from '@states/index';
import { deptScheduleState } from '@states/departments_schedule';
import { personsActiveState } from '@states/persons';
import { DeptWeekType, DepartmentAssignment } from '@definition/departments_schedule';
import { dbDeptScheduleBulkSave } from '@services/dexie/departments_schedule';
import { addWeeks, formatDate } from '@utils/date';
import { schedulesState } from '@states/schedules';
import { schedulesWeekHasNoMeetingAtAll } from '@services/app/schedules';
import { departmentsConfigState } from '@states/settings';
import {
  buildDeptSlots,
  deptConfigForWeek,
} from '@services/app/departments_slots';
import { DepartmentType } from '@definition/person';

export const deptStartAutofill = async (startWeek: string, endWeek: string) => {
  const allSchedules = store.get(deptScheduleState);
  const allPersons = store.get(personsActiveState);
  const meetingSchedules = store.get(schedulesState);
  const departmentsConfig = store.get(departmentsConfigState);

  if (startWeek.length === 0 || endWeek.length === 0) return;

  // Generate all weeks within the range, skipping weeks with no meeting at
  // the hall at all (assembly, convention, memorial, etc.) — there's no
  // ushers/mics/multimedia/platform turn to fill when there's no meeting.
  const rangeWeeks: string[] = [];
  let current = startWeek;
  while (current <= endWeek) {
    if (!schedulesWeekHasNoMeetingAtAll(current, meetingSchedules)) {
      rangeWeeks.push(current);
    }
    const nextDate = addWeeks(current.replace(/\//g, '-'), 1);
    current = formatDate(nextDate, 'yyyy/MM/dd');
  }

  // Use a local copy of all schedules to update dynamically during the process
  const localSchedules = structuredClone(allSchedules);

  // Ensure all weeks in range exist in localSchedules
  for (const weekOf of rangeWeeks) {
    const exists = localSchedules.find((s) => s.weekOf === weekOf);
    if (!exists) {
      localSchedules.push({
        weekOf,
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
      });
    }
  }

  // Sort localSchedules to ensure findIndex for prev week works correctly
  localSchedules.sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  const updatedWeeks: DeptWeekType[] = [];

  // Helper to find the last assignment date for a person in a specific department
  const getLastAssignmentDate = (
    personUid: string,
    dept: string,
    currentWeek: string,
    schedules: DeptWeekType[]
  ) => {
    let lastDate = '';
    for (const schedule of schedules) {
      if (schedule.weekOf >= currentWeek) continue;

      const isAssigned = Object.values(
        schedule[dept as keyof Omit<DeptWeekType, 'weekOf'>] as Record<string, DepartmentAssignment>
      ).some((r) => r.value === personUid);

      if (isAssigned) {
        if (schedule.weekOf > lastDate) {
          lastDate = schedule.weekOf;
        }
      }
    }
    return lastDate;
  };

  // Los puestos ya no están escritos aquí: salen de la configuración de cada
  // departamento, que puede asignar por semana o por reunión y con uno o dos
  // turnos (ver services/app/departments_slots). Se conserva el ORDEN de
  // siempre —plataforma primero, acomodadores al final—, que no es cosmético:
  // se rellena antes lo más restringido, cuando aún queda gente elegible.
  const DEPT_PRIORITY: DepartmentType[] = [
    'plataforma',
    'multimedia',
    'microfonos',
    'acomodadores',
  ];

  // Los puestos se calculan DENTRO del bucle de semanas y no una sola vez: la
  // configuración puede cambiar a mitad del rango (rige desde un mes), y un
  // autocompletado de dos meses tiene que escribir en cada semana las claves
  // que le tocan a su mes.
  const puestosDeLaSemana = (weekOf: string) => {
    const configSemana = deptConfigForWeek(departmentsConfig, weekOf);

    return DEPT_PRIORITY.flatMap((dept) =>
      buildDeptSlots(configSemana, dept).map((slot) => ({
        dept,
        role: slot.key,
      }))
    );
  };

  for (const weekOf of rangeWeeks) {
    const weekSched = localSchedules.find((s) => s.weekOf === weekOf)!;
    const assignedThisWeek: string[] = [];
    const rolesToFill = puestosDeLaSemana(weekOf);

    // Track already manually assigned people for this week
    rolesToFill.forEach(({ dept, role }) => {
      const personUid = (weekSched[dept] as Record<string, DepartmentAssignment>)[role]?.value;
      if (personUid) {
        assignedThisWeek.push(personUid);
      }
    });

    for (const { dept, role } of rolesToFill) {
      if ((weekSched[dept] as Record<string, DepartmentAssignment>)[role]?.value) continue;

      // Filter eligible persons
      let eligiblePersons = allPersons.filter((person) => {
        // 1. Qualified for this department
        const isQualified = person.person_data.departments?.value?.includes(dept);
        if (!isQualified) return false;

        // 2. Not already assigned this week. Esto es lo que además impide que
        // la misma persona caiga en los dos turnos de una reunión, o en la de
        // entre semana y la de fin de semana cuando el departamento se asigna
        // por reunión: sigue siendo una asignación por persona y semana.
        if (assignedThisWeek.includes(person.person_uid)) return false;

        // 3. Not assigned to this department last week
        const currentWeekIndex = localSchedules.findIndex((s) => s.weekOf === weekSched.weekOf);
        if (currentWeekIndex > 0) {
          const prevWeekSched = localSchedules[currentWeekIndex - 1];
          const wasAssignedLastWeek = Object.values(
            prevWeekSched[dept] as Record<string, DepartmentAssignment>
          ).some((r) => r.value === person.person_uid);
          if (wasAssignedLastWeek) return false;
        }

        return true;
      });

      // Relax the 'no consecutive weeks' rule if no one found
      if (eligiblePersons.length === 0) {
        eligiblePersons = allPersons.filter((person) => {
          const isQualified = person.person_data.departments?.value?.includes(dept);
          if (!isQualified) return false;
          if (assignedThisWeek.includes(person.person_uid)) return false;
          return true;
        });
      }

      if (eligiblePersons.length > 0) {
        // Sort by last assignment date (oldest first)
        const sorted = eligiblePersons.sort((a, b) => {
          const dateA = getLastAssignmentDate(a.person_uid, dept, weekSched.weekOf, localSchedules);
          const dateB = getLastAssignmentDate(b.person_uid, dept, weekSched.weekOf, localSchedules);
          return dateA.localeCompare(dateB);
        });

        const selected = sorted[0];
        (weekSched[dept] as Record<string, DepartmentAssignment>)[role] = {
          value: selected.person_uid,
          updatedAt: new Date().toISOString(),
        };
        assignedThisWeek.push(selected.person_uid);
      }
    }
    updatedWeeks.push(weekSched);
  }

  // Update state and DB
  store.set(deptScheduleState, localSchedules);
  await dbDeptScheduleBulkSave(updatedWeeks);
};
