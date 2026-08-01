import {
  UpcomingEventDataType,
  UpcomingEventType,
} from '@definition/upcoming_events';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import {
  generateMonthNames,
  generateWeekday,
  getCurrentLanguage,
  getTranslation,
} from '@services/i18n/translation';
import { store } from '@states/index';
import { hour24FormatState } from '@states/settings';

// El español no capitaliza los nombres de mes en medio de una oración
// ("6 de diciembre", no "6 de Diciembre") — el resto del año en cambio sí lo
// usa como encabezado propio, así que solo se ajusta al escribir fechas. El
// idioma se guarda con el código ISO 639-2 de 3 letras (p. ej. "spa"), no
// "es" — ver threeLettersCode en states/settings.ts.
const monthNameOf = (date: Date) => {
  const month = generateMonthNames()[date.getMonth()];

  return getCurrentLanguage() === 'spa'
    ? month.charAt(0).toLowerCase() + month.slice(1)
    : month;
};

/**
 * Rango de fechas sin año: "12-17 de agosto", o "29 de septiembre-4 de
 * octubre" cuando cruza de mes.
 *
 * Vive aquí y no pegado a la semana de campaña porque cualquier evento de
 * varios días necesita decir de qué mes habla: la agenda de la semana del
 * superintendente solo pintaba "Mié 12" y no había forma de saber el mes.
 */
export const formatDateRangeNoYear = (start: Date, end: Date) => {
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const dayRange = getTranslation({
      key: 'tr_dateRangeNoYear',
      params: { startDate: start.getDate(), endDate: end.getDate() },
    });

    return getTranslation({
      key: 'tr_longDateFullMonthNoYearLocale',
      params: { month: monthNameOf(start), date: dayRange },
    });
  }

  return getTranslation({
    key: 'tr_dateRangeNoYear',
    params: {
      startDate: getTranslation({
        key: 'tr_longDateFullMonthNoYearLocale',
        params: { month: monthNameOf(start), date: start.getDate() },
      }),
      endDate: getTranslation({
        key: 'tr_longDateFullMonthNoYearLocale',
        params: { month: monthNameOf(end), date: end.getDate() },
      }),
    },
  });
};

export const upcomingEventData = (event: UpcomingEventType) => {
  const hour24 = store.get(hour24FormatState);

  const months = generateMonthNames();
  const weekdays = generateWeekday();

  // Aquí ya no hay que ajustar nada: los meses viven en minúscula en el
  // diccionario español, que es como se escriben, y la mayúscula la pone
  // quien abre la etiqueta con ellos. Antes había aquí un `monthCase` que
  // preguntaba "¿estamos en español?" y bajaba la inicial — un parche de una
  // sola pantalla para un fallo que estaba en toda la app.
  const result = {} as UpcomingEventDataType;

  result.uid = event.event_uid;
  result.category = event.event_data.category;
  result.custom = event.event_data.custom;
  result.description = event.event_data.description;
  result.topic = event.event_data.topic;
  result.address = event.event_data.address;
  result.duration = event.event_data.duration;

  result.year = new Date(event.event_data.start).getFullYear();

  const start = new Date(event.event_data.start);
  const date = start.getDate();
  const monthIndex = start.getMonth();

  const month = months[monthIndex];

  result.start = formatDate(start, 'yyyy/MM/dd');
  result.date = getTranslation({
    key: 'tr_longDateFullMonthNoYearLocale',
    params: { month, date },
  });

  const todayIndex = start.getDay();
  result.day = weekdays[todayIndex === 0 ? 6 : todayIndex - 1];

  const eventDates = getDatesBetweenDates(
    event.event_data.start,
    event.event_data.end
  );

  const formatTime = (value: Date) =>
    formatDate(value, hour24 ? 'HH:mm' : 'hh:mmaaa');

  // Solo aplica a la Conmemoración — si aún no se sabe la hora exacta, no
  // se muestra ninguna (ver comentario de timeUnset en la definición).
  const timeUnset = !!event.event_data.timeUnset;

  result.dates = eventDates.map((date) => {
    const dayIndex = date.getDay();
    const dateV = date.getDate();
    const monthIndex = date.getMonth();
    const month = months[monthIndex];
    const dateStr = formatDate(date, 'yyyy/MM/dd');

    // Un evento de varios días puede tener horarios distintos cada
    // jornada (p. ej. una asamblea regional) — si este día tiene su
    // propio horario guardado, se usa ese; si no, cae al horario general
    // del evento (event_data.start/end).
    const override = event.event_data.dailyTimes?.find(
      (record) => record.date === dateStr
    );

    const dayTime = timeUnset
      ? ''
      : getTranslation({
          key: 'tr_dateRangeNoYear',
          params: {
            startDate: formatTime(
              new Date(override ? override.start : event.event_data.start)
            ),
            endDate: formatTime(
              new Date(override ? override.end : event.event_data.end)
            ),
          },
        });

    return {
      date: dateStr,
      day: weekdays[dayIndex === 0 ? 6 : dayIndex - 1],
      dateFormatted: getTranslation({
        key: 'tr_longDateFullMonthNoYearLocale',
        params: { month, date: dateV },
      }),
      time: dayTime,
    };
  });

  // Los eventos de un solo día ya llevan su fecha completa en result.date.
  if (eventDates.length > 1) {
    result.datesRange = formatDateRangeNoYear(
      eventDates.at(0),
      eventDates.at(-1)
    );
  }

  result.time = timeUnset
    ? ''
    : getTranslation({
        key: 'tr_dateRangeNoYear',
        params: {
          startDate: formatTime(new Date(event.event_data.start)),
          endDate: formatTime(new Date(event.event_data.end)),
        },
      });

  return result;
};
