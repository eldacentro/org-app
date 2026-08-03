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

/**
 * CUÁNDO se publicó cada mes.
 *
 * `publishedMonths` contesta «¿está publicado?», y con eso basta para enseñar o
 * esconder. Pero no contesta la otra pregunta, que es la que se hace el
 * responsable: «lo he tocado después de publicarlo, ¿lo sabe la congregación?».
 * Para eso hace falta una referencia contra la que comparar, y una lista de
 * meses sueltos no la tiene.
 *
 * Va en un campo NUEVO y aparte, no dentro de `publishedMonths`, por dos
 * motivos:
 *
 * 1. Un dispositivo que todavía no se haya actualizado sigue leyendo
 *    `publishedMonths` tal cual y decide igual de bien lo único que de verdad
 *    importa: si el mes se ve o no. Cambiar la forma de esa lista sí le rompería
 *    la vista.
 * 2. Sin fecha no se inventa nada. Un mes publicado antes de que esto existiera
 *    no tiene sello, y entonces el aviso sencillamente NO sale — que es honesto:
 *    no se sabe desde cuándo.
 *
 * SOBRE LA SINCRONIZACIÓN, que en este repo es donde se pierden los datos.
 * Estos meses viven en el registro de ajustes de Exhibidores y de Salidas
 * (`weekOf: 'settings'`), y esos registros NO se fusionan campo a campo: gana
 * entero el que traiga el `updatedAt` más nuevo (`dbRestoreExhibitors`,
 * `dbRestoreServiceOutings`). Así que un campo nuevo viaja con su registro y no
 * hay filo de fusión que valga. Lo peor que puede pasar es que un dispositivo
 * sin actualizar guarde los ajustes y se lleve por delante los sellos —
 * entonces se pierde el aviso de «has cambiado cosas», nunca la publicación.
 */
export type PublishedMonthsAt = Record<string, string>;

/** Cuándo se publicó ese mes, si consta. */
export const monthPublishedAt = (
  publishedMonthsAt: PublishedMonthsAt | null | undefined,
  month: string
): string | undefined => {
  const normalized = monthOfDate(month);
  if (!normalized) return undefined;

  const stamp = (publishedMonthsAt ?? {})[normalized];

  return typeof stamp === 'string' && stamp.length > 0 ? stamp : undefined;
};

/**
 * Sella (o borra el sello de) un mes. No muta lo que recibe.
 *
 * Al retirar un mes se BORRA su sello: si se volviera a publicar más tarde,
 * dejar el sello viejo haría que la cuenta de cambios arrastrara todo lo de
 * antes y dijera un número que no significa nada.
 */
export const setMonthPublishedAt = (
  publishedMonthsAt: PublishedMonthsAt | null | undefined,
  month: string,
  published: boolean,
  updatedAt = new Date().toISOString()
): PublishedMonthsAt => {
  const current = { ...(publishedMonthsAt ?? {}) };
  const normalized = monthOfDate(month);

  if (!normalized) return current;

  if (!published) {
    delete current[normalized];

    return current;
  }

  current[normalized] = updatedAt;

  return current;
};

/**
 * Cuántas semanas de ese mes se han tocado desde que se publicó.
 *
 * La unidad es la SEMANA y no el campo, a diferencia de las reuniones: en
 * Exhibidores y en Salidas el registro guardado es la semana entera y lleva un
 * solo `updatedAt`, así que decir «3 cambios» sería inventarse una precisión
 * que los datos no tienen. Quien lo pinte que diga «semanas».
 *
 * Sin sello de publicación devuelve 0: no hay contra qué comparar, y un número
 * inventado aquí manda al responsable a buscar un cambio que no existe.
 */
export const countWeeksChangedSincePublish = (
  weeks: { weekOf: string; updatedAt?: string }[] | null | undefined,
  month: string,
  publishedAt: string | undefined
) => {
  if (!publishedAt) return 0;

  const normalized = monthOfDate(month);
  if (!normalized) return 0;

  return (weeks ?? []).filter(
    (week) =>
      week?.weekOf &&
      monthOfDate(week.weekOf) === normalized &&
      typeof week.updatedAt === 'string' &&
      week.updatedAt > publishedAt
  ).length;
};
