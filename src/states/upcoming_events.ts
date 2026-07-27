/*
This file holds the source of the truth from the table "upcoming_events".
*/

import { atom } from 'jotai';
import { UpcomingEventType } from '@definition/upcoming_events';
import { formatDate } from '@utils/date';

export const upcomingEventsDbState = atom<UpcomingEventType[]>([]);

/**
 * Momento en el que empieza un evento, para poder ordenarlos.
 *
 * `start` NO tiene un único formato: los eventos que se crean a mano se
 * guardan como fecha ISO completa ('2026-12-05T18:00:00.000Z') y la visita del
 * superintendente de circuito, que se proyecta desde su propia entidad, como
 * 'yyyy/MM/dd'. Ordenar comparando las cadenas ponía la visita DESPUÉS de un
 * evento de diciembre por una tontería: '/' va detrás de '-' al comparar
 * texto, así que "2026/11/17" quedaba por detrás de "2026-12-05...".
 *
 * Los dos formatos los entiende `new Date`, así que se ordena por el instante
 * de verdad y da igual cómo esté escrito. Un evento con una fecha ilegible se
 * va al final en vez de descolocar a los demás (un comparador que devuelve NaN
 * deja el orden a merced del motor).
 */
const eventStartTime = (event: UpcomingEventType) => {
  const time = new Date(event.event_data.start).getTime();

  return Number.isNaN(time) ? Infinity : time;
};

export const upcomingEventsState = atom((get) => {
  const events = get(upcomingEventsDbState);

  return events
    .filter((record) => !record.event_data._deleted)
    .sort((a, b) => eventStartTime(a) - eventStartTime(b));
});

export const upcomingEventsActiveState = atom((get) => {
  const events = get(upcomingEventsState);

  return events.filter((record) => {
    const today = formatDate(new Date(), 'yyyy/MM/dd');

    const startDate = formatDate(
      new Date(record.event_data.start),
      'yyyy/MM/dd'
    );

    const endDate = formatDate(new Date(record.event_data.end), 'yyyy/MM/dd');

    return startDate >= today || endDate >= today;
  });
});
