import { DeptWeekType } from '@definition/departments_schedule';
import { DepartmentType } from '@definition/person';
import { AssignmentHistoryType } from '@definition/schedules';
import {
  buildAllDeptSlots,
  DepartmentsConfig,
  DEPT_LABEL,
} from './departments_slots';

/**
 * El historial de los puestos de Departamentos.
 *
 * Va aparte del historial de asignaciones de las reuniones, y a propósito: son
 * dos repartos distintos y mezclarlos no ayuda a decidir ninguno de los dos. A
 * quien reparte los micrófonos le importa cuándo le tocó el micrófono a este
 * hermano, no si leyó la Biblia en marzo.
 *
 * Por eso el botón de historial estaba APAGADO en Departamentos: enseñaba el de
 * las reuniones, que allí no dice nada. Con esto ya dice.
 *
 * Los puestos salen de la configuración (`departments_slots`), no escritos a
 * mano, así que un departamento configurado por reunión o con dos turnos sale
 * con sus puestos de verdad y con el rótulo que le corresponde.
 */
export const deptBuildHistoryList = (
  schedules: DeptWeekType[],
  config: DepartmentsConfig | null | undefined
): AssignmentHistoryType[] => {
  const result: AssignmentHistoryType[] = [];

  const slots = buildAllDeptSlots(config);

  for (const week of schedules ?? []) {
    if (!week?.weekOf) continue;

    for (const slot of slots) {
      const assigned = (
        week[slot.dept] as Record<string, { value?: string }> | undefined
      )?.[slot.key];

      const person_uid = assigned?.value;

      if (!person_uid) continue;

      result.push({
        id: `${week.weekOf}-${slot.dept}-${slot.key}`,
        weekOf: week.weekOf,
        assignment: {
          person: person_uid,
          // Lo que se lee en la tabla: «Micrófonos · Micro 1 · Entre semana».
          title: `${DEPT_LABEL[slot.dept as DepartmentType]} · ${slot.label}`,
          dataView: 'main',
        },
      } as AssignmentHistoryType);
    }
  }

  // De más reciente a más antiguo, como el historial de las reuniones.
  return result.sort((a, b) => b.weekOf.localeCompare(a.weekOf));
};

/** Solo lo de un puesto concreto, para la pestaña de la izquierda. */
export const deptHistoryForSlot = (
  history: AssignmentHistoryType[],
  dept: DepartmentType,
  slotKey: string
) => history.filter((record) => record.id.endsWith(`-${dept}-${slotKey}`));
