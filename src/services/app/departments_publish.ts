import { DeptWeekType } from '@definition/departments_schedule';

/**
 * Borrador / publicado en el programa de departamentos.
 *
 * Mismo problema que en Exhibidores y Salidas: "Autocompletar" rellena varias
 * semanas de una vez y esa propuesta salía disparada a "Mis asignaciones" y a
 * la notificación del hermano antes de que nadie la revisara. Una propuesta no
 * es una decisión.
 *
 * Aquí la unidad es la SEMANA, no el mes, porque así funciona el módulo entero:
 * se edita por semana y el autocompletar pide semanas. Y como cada semana ya es
 * un registro guardado, la marca va en la propia semana en vez de en una lista
 * aparte — no hace falta inventar un registro de ajustes que este módulo no
 * tiene.
 */

/**
 * Desde qué semana hay que publicar. Todo lo anterior se da por publicado, para
 * que al desplegar esto nadie deje de ver de golpe lo que ya está en marcha.
 *
 * Constante y no dato guardado: todos los dispositivos deciden lo mismo sin
 * migrar nada.
 */
export const DEPTS_DRAFT_FROM = '2026/09/01';

/** ¿Hace falta publicarla a mano, o cae en el histórico? */
export const deptWeekNeedsPublishing = (weekOf: string) =>
  typeof weekOf === 'string' && weekOf >= DEPTS_DRAFT_FROM;

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

  if (!deptWeekNeedsPublishing(week.weekOf)) return true;

  return week.published === true;
};
