import { DeptWeekType } from '@definition/departments_schedule';
import { monthNeedsPublishing, monthOfDate } from './month_publish';

/**
 * Borrador / publicado en el programa de departamentos.
 *
 * Mismo problema que en Exhibidores y Salidas: "Autocompletar" rellena varias
 * semanas de una vez y esa propuesta salía disparada a "Mis asignaciones" y a
 * la notificación del hermano antes de que nadie la revisara. Una propuesta no
 * es una decisión.
 *
 * Se publica POR MES, como en los otros dos módulos: es la unidad con la que se
 * piensa el programa. Pero los datos son por semana —aquí cada semana ya es un
 * registro guardado— así que la marca vive en cada semana y publicar un mes
 * marca todas las suyas. No hace falta inventar un registro de ajustes que este
 * módulo no tiene.
 *
 * Una semana pertenece al mes de su LUNES, que es como las agrupa el selector:
 * si publicas septiembre se marca justo lo que ves bajo septiembre.
 */

/**
 * Desde qué mes hay que publicar. Todo lo anterior cae en el histórico y se da
 * por publicado.
 *
 * Constante y no dato guardado: todos los dispositivos deciden lo mismo sin
 * migrar nada.
 *
 * Empezó en septiembre —el mismo corte que Exhibidores y Salidas— pero se
 * adelantó a AGOSTO el 2026-07-28, a petición del responsable: en Exhibidores
 * agosto estaba cancelado y no había nada que decidir, mientras que aquí es un
 * mes de trabajo normal y se estaba publicando solo, según se escribía.
 */
export const DEPTS_DRAFT_FROM = '2026/08';

/** ¿Hace falta publicar ese mes a mano, o cae en el histórico? */
export const deptMonthNeedsPublishing = (month: string) =>
  monthNeedsPublishing(month, DEPTS_DRAFT_FROM);

/**
 * ¿Está publicada esa semana?
 *
 * Una semana sin registro no está publicada, pero tampoco tiene asignaciones
 * que enseñar, así que da igual por dónde se mire.
 */
export const isDeptWeekPublished = (
  week: Pick<DeptWeekType, 'weekOf' | 'published'> | null | undefined
) => {
  if (!week?.weekOf) return false;

  if (!deptMonthNeedsPublishing(week.weekOf)) return true;

  return week.published === true;
};

/** Las semanas guardadas que caen en ese mes (por su lunes). */
export const deptWeeksOfMonth = <T extends Pick<DeptWeekType, 'weekOf'>>(
  schedules: T[],
  month: string
) => {
  const normalized = monthOfDate(month);
  if (!normalized) return [];

  return (schedules ?? []).filter(
    (week) => week?.weekOf && monthOfDate(week.weekOf) === normalized
  );
};

/**
 * ¿Está publicado el mes entero?
 *
 * Con alguna semana sin publicar se responde que NO, para que el botón siga
 * ofreciendo publicar y se pueda terminar el mes; si no, quedaría a medias sin
 * que nada lo dijera.
 */
export const isDeptMonthPublished = (
  schedules: Pick<DeptWeekType, 'weekOf' | 'published'>[],
  month: string
) => {
  if (!deptMonthNeedsPublishing(month)) return true;

  const weeks = deptWeeksOfMonth(schedules, month);

  if (weeks.length === 0) return false;

  return weeks.every((week) => week.published === true);
};

/**
 * Devuelve las semanas del mes que hay que GUARDAR para publicarlo o retirarlo.
 *
 * Solo las que cambian: guardar un registro idéntico despierta la
 * sincronización de toda la congregación para nada.
 */
export const setDeptMonthPublished = (
  schedules: DeptWeekType[],
  month: string,
  published: boolean
): DeptWeekType[] => {
  const weeks = deptWeeksOfMonth(schedules, month);

  return weeks
    .filter((week) => (week.published === true) !== published)
    .map((week) => {
      const updated = structuredClone(week);
      updated.published = published;

      return updated;
    });
};
