import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';

/**
 * Las asignaciones marcadas como «por cambiar».
 *
 * QUÉ PROBLEMA RESUELVE. Un hermano avisa el jueves de que no puede con su
 * parte del mes que viene. Hasta ahora eso vivía en la cabeza de quien lo
 * atendió —o en un mensaje de WhatsApp— hasta que se acordara de buscar
 * sustituto. Marcarlo en la propia parte lo saca de ahí y lo convierte en una
 * lista que se puede mirar.
 *
 * LA PARTE NO SE VACÍA AL MARCARLA, y es lo importante: sigue asignada a esa
 * persona y así se sigue viendo en el programa. Quitarla dejaría un hueco, y un
 * hueco no se distingue de una parte que todavía no se ha repartido — con lo
 * que el aviso se perdería justo igual que antes.
 *
 * Aparte de React para poder probarse sola: equivocarse aquí no rompe nada a la
 * vista, solo deja de enseñar una parte que hay que cambiar. Y eso no se nota
 * hasta el día de la reunión.
 */

export type PartePorCambiar = {
  weekOf: string;
  assignment: AssignmentFieldType;
  /** person_uid de quien la tiene ahora. */
  person: string;
  /** Su nombre, tal como quedó copiado en la asignación. */
  name: string;
  /** Quién la marcó, si consta. */
  by?: string;
  /** Cuándo se marcó. */
  at?: string;
};

/**
 * Recorre el programa y saca lo marcado, de una semana en adelante.
 *
 * Se le pasan `assignmentsForWeek` y `getAssignment` en vez de leer el programa
 * por su cuenta, igual que `pendingS89Slips`: qué partes tiene una semana
 * depende de ajustes de la congregación, y esa cuenta ya está hecha en un sitio.
 *
 * DESDE UNA SEMANA EN ADELANTE, no todo el histórico: una parte de hace tres
 * meses que se quedó marcada ya no se puede arreglar, y en la lista solo sería
 * ruido que empuja hacia abajo lo que sí se puede hacer.
 */
export const partesPorCambiar = ({
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
  assignmentsForWeek: (
    schedule: SchedWeekType,
    dataView: string
  ) => AssignmentFieldType[];
  getAssignment: (
    schedule: SchedWeekType,
    assignment: AssignmentFieldType,
    dataView: string
  ) => AssignmentCongregation | undefined;
}): PartePorCambiar[] => {
  const result: PartePorCambiar[] = [];

  const weeks = (schedules ?? [])
    .filter((record) => record.weekOf >= fromWeek)
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  for (const schedule of weeks) {
    for (const assignment of assignmentsForWeek(schedule, dataView)) {
      const assigned = getAssignment(schedule, assignment, dataView);

      if (!assigned?.toReplace) continue;

      // Sin nadie asignado no hay a quién cambiar. Puede pasar si alguien vació
      // la parte a mano sin quitar la marca: entonces ya está arreglada —el
      // hueco se ve solo— y sacarla aquí sería pedir dos veces lo mismo.
      if (!assigned.value) continue;

      result.push({
        weekOf: schedule.weekOf,
        assignment,
        person: assigned.value,
        name: assigned.name ?? '',
        by: assigned.toReplaceBy,
        at: assigned.toReplaceAt,
      });
    }
  }

  return result;
};
