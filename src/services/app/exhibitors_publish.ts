import { ExhibitorSettingsType } from '@definition/exhibitors';

/**
 * Meses de exhibidores publicados.
 *
 * Las asignaciones fijas son una PLANTILLA, no una decisión: dicen quién suele
 * llevar cada turno, pero a quién le toca de verdad lo decide el responsable
 * cada mes. La app no distinguía las dos cosas, así que en cuanto existía la
 * fecha en el calendario daba el turno por asignado — para siempre y hacia
 * delante. Septiembre le salía a los hermanos en "Mis asignaciones", en el
 * programa semanal y hasta por notificación, sin que nadie lo hubiera
 * confirmado y sin tener todos los turnos cubiertos.
 *
 * Ahora un mes está en BORRADOR hasta que alguien lo publica. En borrador solo
 * lo ve quien puede editarlo.
 */

/**
 * Desde qué mes hay que publicar.
 *
 * Antes de este mes no existía el concepto, así que todo lo anterior se da por
 * publicado: si no, al desplegar esto la congregación entera dejaría de ver de
 * golpe los turnos que ya están en marcha. Agosto entra en el corte porque los
 * exhibidores están cancelados ese mes y no hay nada que confirmar.
 *
 * Es una constante y no un dato guardado a propósito: así todos los
 * dispositivos deciden lo mismo sin necesidad de migrar nada, que en esta
 * aplicación es justo donde se han perdido datos antes.
 */
export const EXHIBITORS_DRAFT_FROM = '2026/09';

/** 'YYYY/MM' de una fecha 'YYYY/MM/DD' (o de un mes ya recortado). */
export const monthOfDate = (date: string) => {
  if (typeof date !== 'string') return '';

  const month = date.trim().slice(0, 7).replace('-', '/');

  return /^\d{4}\/\d{2}$/.test(month) ? month : '';
};

/**
 * ¿Está publicado ese mes?
 *
 * Un mes anterior al corte se da por publicado aunque no esté en la lista: es
 * el histórico, de cuando esto no existía.
 */
export const isExhibitorMonthPublished = (
  settings: Pick<ExhibitorSettingsType, 'publishedMonths'> | null | undefined,
  month: string
) => {
  const normalized = monthOfDate(month);
  if (!normalized) return false;

  if (normalized < EXHIBITORS_DRAFT_FROM) return true;

  return (settings?.publishedMonths ?? []).includes(normalized);
};

/** ¿Hace falta publicarlo a mano, o cae en el histórico? */
export const monthNeedsPublishing = (month: string) => {
  const normalized = monthOfDate(month);

  return normalized !== '' && normalized >= EXHIBITORS_DRAFT_FROM;
};

/**
 * Publica o retira un mes. Devuelve la lista nueva, ordenada y sin repetidos.
 *
 * No muta lo que recibe: quien llama decide cuándo guardar.
 */
export const setExhibitorMonthPublished = (
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

export type ExhibitorMonthStatus = {
  month: string;
  published: boolean;
  /** Si cae en el histórico, no se puede retirar: nunca se publicó a mano. */
  isHistoric: boolean;
};

/** Estado de una lista de meses, para pintar el diálogo de publicación. */
export const buildExhibitorMonthsStatus = (
  settings: Pick<ExhibitorSettingsType, 'publishedMonths'> | null | undefined,
  months: string[]
): ExhibitorMonthStatus[] =>
  months.map((month) => ({
    month: monthOfDate(month),
    published: isExhibitorMonthPublished(settings, month),
    isHistoric: !monthNeedsPublishing(month),
  }));
