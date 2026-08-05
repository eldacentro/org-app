import { store } from '@states/index';
import { meetingExactDateState } from '@states/settings';
import { schedulesGetMeetingDate } from './schedules';
import { monthOfDate } from './month_publish';
import { addDays, formatDate } from '@utils/date';
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

/**
 * El día en que se celebra esa reunión, para preguntar por ausencias.
 *
 * Preguntar por el LUNES de la semana —que es lo que se hacía— da falsos
 * avisos, y salió uno real: una ausencia del 21 de julio al 4 de agosto, con la
 * reunión el miércoles 5. El lunes 3 cae dentro, así que la tira decía «tiene
 * una ausencia en las fechas que tiene asignadas»; pero el hermano ya había
 * vuelto el día de la reunión, y el aviso de debajo del campo —que sí pregunta
 * por el día de la reunión— no decía nada. Dos avisos de lo mismo diciendo
 * cosas distintas, y el de arriba mintiendo.
 *
 * Los discursos salientes se celebran el día de la reunión de fin de semana.
 */
export const meetingDateOfWeek = (weekOf: string, key: MeetingPublishKey) => {
  if (!weekOf) return '';

  const { date } = schedulesGetMeetingDate({
    week: weekOf,
    meeting: key === 'midweek' ? 'midweek' : 'weekend',
  });

  return date || weekOf;
};

/**
 * El día en que un hermano SALE a dar el discurso.
 *
 * No es el día de nuestra reunión: es el de la congregación a la que va, que
 * bien puede tenerla el sábado cuando aquí es el domingo. Preguntarle a la
 * nuestra avisa del día equivocado, que es justo el fallo que ya salió una vez.
 *
 * SOBRE EL NÚMERO. Es el mismo que usa el desplegable del editor: 0 = lunes,
 * 1 = martes... 6 = domingo. Pero en los datos reales de la congregación hay
 * registros con un 7, de cuando el dato entraba crudo desde la búsqueda de
 * congregaciones (que lo da en escala 1-7). Hoy ese 7 sale EN BLANCO en el
 * desplegable, porque no hay opción con ese valor. Un 7 solo pudo querer decir
 * domingo, así que se lee como domingo en vez de tirarlo.
 *
 * El 0 se trata como «sin poner», no como lunes: ninguna congregación tiene la
 * reunión del fin de semana un lunes, y 0 es el valor con el que nacen varios
 * registros. Inventarse un lunes sería peor que callar.
 */
export const outgoingTalkDate = (
  weekOf: string,
  weekday: number | string | undefined | null
): string => {
  if (!weekOf) return '';

  const dia = Number(weekday);

  if (!Number.isInteger(dia) || dia < 1 || dia > 7) return '';

  return formatDate(addDays(weekOf, Math.min(dia, 6)), 'yyyy/MM/dd');
};
