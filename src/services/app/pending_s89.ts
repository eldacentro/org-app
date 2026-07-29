import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';

/**
 * Las hojitas que quedan por confirmar.
 *
 * Existe porque las hojitas se reparten con dos meses de antelación: repasar
 * semana a semana para ver cuál falta es justo lo que hace que se escape
 * alguna. Esto lo dice de una vez.
 *
 * Solo mira HACIA DELANTE. Una hojita sin confirmar de una reunión que ya pasó
 * no es una tarea pendiente, es historia: dejarla en la lista la llenaría de
 * ruido permanente y acabaría ignorándose entera, que es peor que no tenerla.
 *
 * Es una función PURA —recibe los programas y devuelve datos— para poder
 * probarla, y porque contar mal aquí se traduce en hojitas sin entregar.
 * Quién es cada persona lo resuelve quien la llama: aquí solo va el uid.
 */

export type PendingSlip = {
  weekOf: string;
  assignment: AssignmentFieldType;
  /** person_uid de quien tiene la parte. */
  person: string;
};

export const pendingS89Slips = ({
  schedules,
  dataView,
  fromWeek,
  assignmentsForWeek,
  getAssignment,
}: {
  schedules: SchedWeekType[];
  dataView: string;
  /** Lunes ('YYYY/MM/DD') de la primera semana que cuenta. */
  fromWeek: string;
  /** Qué asignaciones llevan hojita esa semana (ver schedulesS89AssignmentsForWeek). */
  assignmentsForWeek: (
    schedule: SchedWeekType,
    dataView: string
  ) => AssignmentFieldType[];
  /** Cómo leer una asignación concreta del programa. */
  getAssignment: (
    schedule: SchedWeekType,
    assignment: AssignmentFieldType,
    dataView: string
  ) => AssignmentCongregation | undefined;
}): PendingSlip[] => {
  const result: PendingSlip[] = [];

  const weeks = schedules
    .filter((record) => record.weekOf >= fromWeek)
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  for (const schedule of weeks) {
    for (const assignment of assignmentsForWeek(schedule, dataView)) {
      const assigned = getAssignment(schedule, assignment, dataView);

      // Sin nadie asignado no hay hojita que entregar. Eso es un hueco del
      // programa, no una hojita pendiente, y mezclarlos haría que el número
      // dejara de significar "esto lo tengo que hacer yo".
      if (!assigned?.value) continue;

      if (assigned.confirmed) continue;

      result.push({
        weekOf: schedule.weekOf,
        assignment,
        person: assigned.value,
      });
    }
  }

  return result;
};
