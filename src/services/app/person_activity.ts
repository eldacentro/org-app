import { CircuitVisitType } from '@definition/circuit_visit';
import { DeptWeekType } from '@definition/departments_schedule';
import { ExhibitorWeekType } from '@definition/exhibitors';
import { ServiceOutingWeekType } from '@definition/service_outings';
import { ACTIVITY_LABELS } from '@services/app/circuit_visit';
import { toComparableDate } from '@utils/date';
import {
  buildAllDeptSlots,
  deptConfigForWeek,
  DEPT_LABEL,
  DepartmentsConfigStored,
} from '@services/app/departments_slots';

/**
 * Todo lo que una persona tiene o ha tenido asignado, de todos los módulos.
 *
 * Hasta ahora la ficha solo enseñaba las asignaciones de reunión. El resto
 * —departamentos, exhibidores, salidas, la visita del superintendente— vivía
 * cada uno en su propia página y por semanas, así que para saber qué hace un
 * hermano había que recorrer cinco sitios distintos.
 *
 * Cada módulo guarda sus asignaciones de una forma distinta (por semana, por
 * turno, dentro de la visita…). Aquí se normalizan todas a la misma forma, y
 * se hace en funciones puras para poder probarlas: son puro recorrido de
 * estructuras anidadas, justo donde un `?.` de más se lleva por delante media
 * lista sin que nadie se entere.
 *
 * Las reuniones NO se construyen aquí: ya existe `schedulesBuildHistoryList()`
 * y sería absurdo duplicar sus reglas. El hook las trae de ahí y las mete en
 * esta misma lista.
 */

export type ActivityCategory =
  | 'meeting'
  | 'department'
  | 'outing'
  | 'exhibitor'
  | 'circuit_visit'
  | 'territory';

export type ActivityItem = {
  key: string;
  /** 'yyyy/MM/dd'. Para lo que dura una semana, el lunes. */
  date: string;
  category: ActivityCategory;
  title: string;
  /** Segunda línea: sala, lugar, hora, con quién… */
  detail?: string;
  /** La fecha es la de toda una semana, no la de un día concreto. */
  wholeWeek?: boolean;
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  meeting: 'Reuniones',
  department: 'Departamentos',
  outing: 'Salidas de predicación',
  exhibitor: 'Exhibidores',
  circuit_visit: 'Visita del superintendente',
  territory: 'Territorios',
};

export const buildDepartmentActivity = (
  weeks: DeptWeekType[],
  uid: string,
  config?: DepartmentsConfigStored | null
): ActivityItem[] => {
  const items: ActivityItem[] = [];

  for (const week of weeks ?? []) {
    const date = toComparableDate(week?.weekOf);
    if (!date) continue;

    // Los puestos salen de la configuración de cada departamento (por semana
    // o por reunión, con uno o dos turnos), no de una lista escrita a mano. Y
    // de la que regía el mes de esa semana: esto mira hacia atrás, y la
    // configuración cambia a partir de un mes.
    for (const slot of buildAllDeptSlots(
      deptConfigForWeek(config, week.weekOf)
    )) {
      if (week[slot.dept]?.[slot.key]?.value !== uid) continue;

      items.push({
        key: `DEPT:${week.weekOf}:${slot.dept}.${slot.key}`,
        date,
        category: 'department',
        title: `${DEPT_LABEL[slot.dept]} · ${slot.label}`,
        wholeWeek: true,
      });
    }
  }

  return items;
};

export const buildOutingActivity = (
  weeks: ServiceOutingWeekType[],
  uid: string
): ActivityItem[] => {
  const items: ActivityItem[] = [];

  for (const week of weeks ?? []) {
    for (const outing of week?.outings ?? []) {
      // Un turno anulado no llegó a ser una asignación de nadie.
      if (outing.cancelled) continue;
      if (outing.person !== uid) continue;

      const date = toComparableDate(outing.date);
      if (!date) continue;

      items.push({
        key: `OUTING:${outing.id}`,
        date,
        category: 'outing',
        title: 'Salida de predicación',
        detail: [outing.time, outing.location].filter(Boolean).join(' · '),
      });
    }
  }

  return items;
};

export const buildExhibitorActivity = (
  weeks: ExhibitorWeekType[],
  uid: string
): ActivityItem[] => {
  const items: ActivityItem[] = [];

  for (const week of weeks ?? []) {
    for (const turn of week?.turns ?? []) {
      if (turn.cancelled) continue;

      const assignment = (turn.assignments ?? []).find(
        (record) => record.person === uid
      );
      if (!assignment) continue;

      const date = toComparableDate(turn.date);
      if (!date) continue;

      items.push({
        key: `EXHIBITOR:${turn.date}:${turn.turnId}`,
        date,
        category: 'exhibitor',
        title: assignment.isResponsible
          ? 'Exhibidores (responsable)'
          : 'Exhibidores',
        detail: turn.location,
      });
    }
  }

  return items;
};

/**
 * Lo que una persona hace DURANTE una visita del superintendente.
 *
 * Se deja fuera a propósito al hermano visitado en una visita de pastoreo
 * (`shepherding_visits.brother`): quien acompaña tiene una asignación, quien
 * la recibe no, y no es un dato que deba quedar apuntado en su expediente.
 * Es el mismo criterio que ya sigue "Mis asignaciones".
 */
export const buildCircuitVisitActivity = (
  visits: CircuitVisitType[],
  uid: string
): ActivityItem[] => {
  const items: ActivityItem[] = [];

  for (const visit of visits ?? []) {
    if (visit?._deleted) continue;

    for (const meal of visit.meals ?? []) {
      if (meal.host !== uid) continue;

      const date = toComparableDate(meal.date) || toComparableDate(visit.date_start);
      if (!date) continue;

      items.push({
        key: `COVISIT_MEAL:${visit.id}:${meal.id}`,
        date,
        category: 'circuit_visit',
        title: 'Comida con el superintendente',
        detail: meal.note || undefined,
      });
    }

    for (const companion of visit.co_companions ?? []) {
      // La clave de la salida es `${fecha}_${hora}`; si viniera mal formada,
      // la visita entera sigue teniendo fecha y es mejor eso que perder la
      // asignación.
      const [outingDate, outingTime] = (companion.outingKey ?? '').split('_');
      const date =
        toComparableDate(outingDate) || toComparableDate(visit.date_start);
      if (!date) continue;

      const activity = ACTIVITY_LABELS[companion.activity];

      if (companion.brother === uid) {
        items.push({
          key: `COVISIT_COMPANION:${visit.id}:${companion.outingKey}`,
          date,
          category: 'circuit_visit',
          title: 'Acompañó al superintendente',
          detail: [outingTime, activity].filter(Boolean).join(' · '),
        });
      }

      if ((companion.spouse_companions ?? []).includes(uid)) {
        items.push({
          key: `COVISIT_SPOUSE:${visit.id}:${companion.outingKey}`,
          date,
          category: 'circuit_visit',
          title: 'Acompañó a la esposa del superintendente',
          detail: [outingTime, activity].filter(Boolean).join(' · '),
        });
      }
    }

    for (const shepherding of visit.shepherding_visits ?? []) {
      if (shepherding.elder !== uid) continue;

      const date =
        toComparableDate(shepherding.date) || toComparableDate(visit.date_start);
      if (!date) continue;

      items.push({
        key: `COVISIT_SHEPHERDING:${visit.id}:${shepherding.id}`,
        date,
        category: 'circuit_visit',
        title: 'Visita de pastoreo (acompañante)',
        detail: shepherding.time || undefined,
      });
    }
  }

  return items;
};

/** Más reciente primero; a igualdad de fecha, orden estable por clave. */
export const sortActivity = (items: ActivityItem[]) =>
  items.toSorted((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.key.localeCompare(b.key);
  });

export type ActivityGroup = {
  /** 'yyyy/MM' — el mes al que pertenecen. */
  month: string;
  items: ActivityItem[];
};

/** Agrupa por mes conservando el orden de entrada (más reciente primero). */
export const groupActivityByMonth = (items: ActivityItem[]): ActivityGroup[] => {
  const groups: ActivityGroup[] = [];

  for (const item of items) {
    const month = item.date.slice(0, 7);
    const last = groups.at(-1);

    if (last?.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }

  return groups;
};
