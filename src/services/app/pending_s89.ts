import { AssignmentCode, AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';
import { SourceWeekType } from '@definition/sources';
import { S89_ASSIGNMENTS } from '@constants/index';

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

/**
 * ¿Esta asignación concreta lleva hoja S-89?
 *
 * La S-89 es la papeleta de la Escuela del Ministerio, y se le da a un
 * ESTUDIANTE. Las partes de "Seamos mejores maestros" de tipo «Análisis»
 * (`MM_Discussion`) no las hace un estudiante: las dirige un anciano o un
 * siervo ministerial, y por eso el propio selector de persona las manda al
 * selector de hermanos y no al de estudiantes. No llevan papeleta.
 *
 * Pero se guardan en el mismo campo que las demás (`MM_AYFPartN_Student_A`),
 * que está en `S89_ASSIGNMENTS`. Consecuencia: el contador de "hojitas
 * pendientes" las contaba, se imprimía una S-89 para ellas, y la casilla de
 * "entregada" no se dibujaba nunca —porque el selector de hermanos no la
 * tiene—, así que quedaban pendientes PARA SIEMPRE y el número nunca bajaba
 * a cero.
 *
 * El tipo de parte no está en el programa, está en el material de la reunión,
 * así que hace falta el `source` de esa semana. Sin él se responde que sí,
 * que es como se comportaba antes: es preferible una hojita de más a que
 * desaparezca una que sí tocaba.
 */
export const schedulesS89AssignmentCarriesSlip = (
  assignment: AssignmentFieldType,
  source: SourceWeekType | undefined,
  lang: string
): boolean => {
  if (!(S89_ASSIGNMENTS as readonly string[]).includes(assignment)) {
    return false;
  }

  // La lectura de la Biblia siempre es de un estudiante.
  if (!assignment.includes('AYFPart')) return true;

  const partNum = assignment.match(/\d+/)?.at(0);
  if (!partNum) return true;

  const code: AssignmentCode =
    source?.midweek_meeting?.[`ayf_part${partNum}`]?.type?.[lang];

  if (!code) return true;

  return code !== AssignmentCode.MM_Discussion;
};
