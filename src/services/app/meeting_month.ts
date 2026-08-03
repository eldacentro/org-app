import { store } from '@states/index';
import { meetingExactDateState } from '@states/settings';
import { schedulesGetMeetingDate } from './schedules';
import { monthOfDate } from './month_publish';
import type { MeetingPublishKey } from './meetings_publish';

/**
 * ¿A qué mes pertenece una semana, para publicarla?
 *
 * Parece una pregunta tonta y no lo es. Una semana empieza en lunes, pero la
 * reunión cae a mitad de semana, y cuatro o cinco veces al año esas dos cosas
 * están en meses distintos: la semana del 31 de agosto de 2026 tiene su reunión
 * de entre semana el 2 de septiembre.
 *
 * EL FALLO QUE ESTO ARREGLA. El selector de semanas del editor archiva cada
 * semana por el DÍA DE LA REUNIÓN —así lo pidió la congregación, y por eso el
 * rótulo dice «2 Sep» y no «31 Ago»—, mientras que publicar iba por el LUNES.
 * Dos reglas para el mismo dato, y de ahí salían dos cosas feas:
 *
 * 1. Abres esa semana (te sale bajo SEPTIEMBRE) y **no hay botón de publicar**,
 *    porque por dentro es de agosto. Comprobado en pantalla.
 * 2. Y la peligrosa: la reunión del 1 de octubre de 2026 es de la semana del 28
 *    de septiembre. El responsable la ve bajo OCTUBRE, termina el mes, le da a
 *    «Publicar octubre»... y esa semana NO entra. Se queda en borrador y la
 *    congregación no ve la primera reunión del mes, sin que nada lo diga.
 *
 * Así que publicar pasa a agrupar como agrupa el selector. La regla se copia de
 * `useWeekPickerPanel`, que es quien la manda:
 *
 * - Fin de semana: SIEMPRE por el día de la reunión.
 * - Entre semana: por el día de la reunión solo si está puesta «fecha exacta»
 *   (`schedule_exact_date_enabled`); si no, por el lunes, que es como se
 *   agrupan las semanas de las publicaciones.
 *
 * Ese ajuste es de la CONGREGACIÓN y no de cada usuario, así que dos
 * dispositivos nunca discrepan sobre qué semanas cubre un mes. Si fuera de cada
 * uno, esto no se podría hacer.
 *
 * LO QUE ESTO NO TOCA, a propósito: si una semana SE VE o no. Eso lo sigue
 * decidiendo la marca de la propia semana y el corte por su lunes
 * (`isMeetingWeekPublished`), exactamente igual que antes. Cambiarlo también
 * haría desaparecer hoy mismo la semana del 31 de agosto, que hoy se ve — y la
 * regla de la casa es que lo que se ve se sigue viendo. Aquí solo se arregla
 * QUÉ cubre el botón, que era el agujero.
 *
 * Los discursos salientes se quedan con el lunes: su página tiene su propia
 * lista de semanas, agrupada por lunes, así que ahí las dos reglas ya coinciden.
 */
export const meetingMonthOfWeek = (
  weekOf: string,
  key: MeetingPublishKey
): string => {
  if (!weekOf) return '';

  if (key === 'outgoing') return monthOfDate(weekOf);

  if (key === 'midweek' && !store.get(meetingExactDateState)) {
    return monthOfDate(weekOf);
  }

  const meeting = key === 'midweek' ? 'midweek' : 'weekend';

  const { date } = schedulesGetMeetingDate({ week: weekOf, meeting });

  // Sin fecha calculable nos quedamos con el lunes: es la respuesta de siempre
  // y nunca deja una semana sin mes.
  return monthOfDate(date) || monthOfDate(weekOf);
};

/** El mismo cálculo, ya atado a un programa, para pasarlo como resolvedor. */
export const meetingMonthResolver =
  (key: MeetingPublishKey) => (weekOf: string) =>
    meetingMonthOfWeek(weekOf, key);
