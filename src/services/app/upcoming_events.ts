import {
  UpcomingEventCategory,
  UpcomingEventDataType,
  UpcomingEventType,
} from '@definition/upcoming_events';
import { formatDate, getDatesBetweenDates } from '@utils/date';
import {
  generateMonthShortNames,
  generateWeekday,
  getTranslation,
} from '@services/i18n/translation';
import { store } from '@states/index';
import { hour24FormatState } from '@states/settings';

export const upcomingEventData = (event: UpcomingEventType) => {
  const hour24 = store.get(hour24FormatState);

  const months = generateMonthShortNames();
  const weekdays = generateWeekday();

  const result = {} as UpcomingEventDataType;

  result.uid = event.event_uid;
  result.category = event.event_data.category;
  result.custom = event.event_data.custom;
  result.description = event.event_data.description;
  result.duration = event.event_data.duration;

  result.year = new Date(event.event_data.start).getFullYear();

  const start = new Date(event.event_data.start);
  const date = start.getDate();
  const monthIndex = start.getMonth();

  const month = months[monthIndex];

  result.start = formatDate(start, 'yyyy/MM/dd');
  result.date = getTranslation({
    key: 'tr_longDateNoYearLocale',
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
        key: 'tr_longDateNoYearLocale',
        params: { month, date: dateV },
      }),
      time: dayTime,
    };
  });

  if (event.event_data.category === UpcomingEventCategory.SpecialCampaignWeek) {
    const startDate = eventDates.at(0);
    const startDateV = startDate.getDate();
    const startMonthIndex = startDate.getMonth();
    const startMonth = months[startMonthIndex];

    const endDate = eventDates.at(-1);
    const endDateV = endDate.getDate();
    const endMonthIndex = endDate.getMonth();
    const endMonth = months[endMonthIndex];

    if (startMonthIndex !== endMonthIndex) {
      const startDateFormatted = getTranslation({
        key: 'tr_longDateNoYearLocale',
        params: {
          month: startMonth,
          date: startDateV,
        },
      });

      const endDateFormatted = getTranslation({
        key: 'tr_longDateNoYearLocale',
        params: {
          month: endMonth,
          date: endDateV,
        },
      });

      result.datesRange = getTranslation({
        key: 'tr_dateRangeNoYear',
        params: {
          startDate: startDateFormatted,
          endDate: endDateFormatted,
        },
      });
    }

    if (startMonthIndex === endMonthIndex) {
      const dateRanges = getTranslation({
        key: 'tr_dateRangeNoYear',
        params: {
          startDate: startDateV,
          endDate: endDateV,
        },
      });

      result.datesRange = getTranslation({
        key: 'tr_longDateNoYearLocale',
        params: {
          month: startMonth,
          date: dateRanges,
        },
      });
    }
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
