import { ServiceOutingSettingsType } from '@definition/service_outings';
import {
  isMonthPublished,
  monthNeedsPublishing as needsPublishing,
  setMonthPublished,
} from './month_publish';

/**
 * Meses de salidas de predicación publicados.
 *
 * "Autocompletar" llena el mes ENTERO de una vez, y hasta ahora esa propuesta
 * salía disparada: aparecía en "Mis asignaciones" de cada hermano y generaba
 * notificación antes de que el responsable la hubiera mirado. Una propuesta no
 * es una decisión.
 *
 * Mismo criterio que en Exhibidores, y por los mismos motivos: ver
 * `services/app/month_publish`.
 */

/**
 * Desde qué mes hay que publicar. Todo lo anterior se da por publicado, para
 * que al desplegar esto nadie deje de ver de golpe lo que ya está en marcha.
 *
 * Constante y no dato guardado: todos los dispositivos deciden lo mismo sin
 * migrar nada.
 */
export const OUTINGS_DRAFT_FROM = '2026/09';

export const isOutingsMonthPublished = (
  settings: Pick<ServiceOutingSettingsType, 'publishedMonths'> | null | undefined,
  month: string
) => isMonthPublished(settings?.publishedMonths, month, OUTINGS_DRAFT_FROM);

/** ¿Hace falta publicarlo a mano, o cae en el histórico? */
export const outingsMonthNeedsPublishing = (month: string) =>
  needsPublishing(month, OUTINGS_DRAFT_FROM);

export const setOutingsMonthPublished = setMonthPublished;
