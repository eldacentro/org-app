/**
 * Borrador / publicado, por mes.
 *
 * Varios módulos reparten asignaciones por meses y tienen un "autocompletar"
 * que llena el mes entero de golpe. Sin una puerta, esa propuesta llega al
 * hermano —a "Mis asignaciones", al programa semanal y por notificación— antes
 * de que el responsable la haya revisado. La propuesta no es la decisión.
 *
 * Aquí vive solo la DECISIÓN (¿está publicado este mes?), que es igual para
 * todos. Dónde se guarda cambia según el módulo, porque la forma de los datos
 * cambia:
 *
 * - Exhibidores: los turnos se generan al vuelo desde una plantilla, así que no
 *   hay dónde poner una marca; se guarda la lista de meses publicados en los
 *   ajustes.
 * - Salidas de predicación: igual, tiene registro de ajustes.
 * - Departamentos: no tiene ajustes, y cada semana ya es un registro guardado;
 *   la marca va en la propia semana.
 */

/** 'YYYY/MM' de una fecha 'YYYY/MM/DD' (o de un mes ya recortado). */
export const monthOfDate = (date: string) => {
  if (typeof date !== 'string') return '';

  const month = date.trim().slice(0, 7).replace('-', '/');

  return /^\d{4}\/\d{2}$/.test(month) ? month : '';
};

/**
 * ¿Hay que publicarlo a mano, o cae en el histórico?
 *
 * Antes del corte no existía este concepto, así que todo lo anterior se da por
 * publicado: si no, al desplegar el cambio la congregación entera dejaría de
 * ver de golpe lo que ya está en marcha.
 */
export const monthNeedsPublishing = (month: string, draftFrom: string) => {
  const normalized = monthOfDate(month);

  return normalized !== '' && normalized >= draftFrom;
};

/** ¿Está publicado ese mes? */
export const isMonthPublished = (
  publishedMonths: string[] | null | undefined,
  month: string,
  draftFrom: string
) => {
  const normalized = monthOfDate(month);
  if (!normalized) return false;

  if (normalized < draftFrom) return true;

  return (publishedMonths ?? []).includes(normalized);
};

/**
 * Publica o retira un mes. Devuelve la lista nueva, ordenada y sin repetidos.
 * No muta lo que recibe: quien llama decide cuándo guardar.
 */
export const setMonthPublished = (
  publishedMonths: string[] | undefined,
  month: string,
  published: boolean
) => {
  const normalized = monthOfDate(month);
  const current = publishedMonths ?? [];

  if (!normalized) return [...current];

  const without = current.filter((item) => item !== normalized);

  if (!published) return without.sort();

  return [...without, normalized].sort();
};
