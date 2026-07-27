import { describe, expect, it } from 'vitest';
import { createStore } from 'jotai';
import { UpcomingEventType } from '@definition/upcoming_events';
import { upcomingEventsDbState, upcomingEventsState } from './upcoming_events';

/**
 * El orden de "Próximos eventos".
 *
 * Los eventos no guardan todos su fecha con la misma forma: los que se crean a
 * mano llevan una fecha ISO completa, y la visita del superintendente de
 * circuito —que no se crea a mano, se proyecta desde su propia entidad— la
 * lleva como 'yyyy/MM/dd'. Ordenar comparando las cadenas hacía que la visita
 * apareciera detrás de un evento de diciembre aunque fuera de noviembre.
 */

const evento = (
  uid: string,
  start: string,
  { borrado = false } = {}
): UpcomingEventType =>
  ({
    event_uid: uid,
    event_data: {
      start,
      end: start,
      _deleted: borrado,
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  }) as unknown as UpcomingEventType;

const ordenar = (events: UpcomingEventType[]) => {
  const store = createStore();
  store.set(upcomingEventsDbState, events);

  return store.get(upcomingEventsState).map((record) => record.event_uid);
};

describe('orden de los próximos eventos', () => {
  it('la visita del circuito va por su fecha, no por cómo esté escrita', () => {
    // El caso reportado: la visita es de noviembre, así que va PRIMERO.
    const visita = evento('visita-noviembre', '2026/11/17');
    const diciembre = evento('evento-diciembre', '2026-12-05T18:00:00.000Z');

    expect(ordenar([diciembre, visita])).toEqual([
      'visita-noviembre',
      'evento-diciembre',
    ]);
  });

  it('y si la visita es posterior, va después', () => {
    const visita = evento('visita-enero', '2027/01/12');
    const diciembre = evento('evento-diciembre', '2026-12-05T18:00:00.000Z');

    expect(ordenar([visita, diciembre])).toEqual([
      'evento-diciembre',
      'visita-enero',
    ]);
  });

  it('varios eventos del mismo día se ordenan por la hora', () => {
    const tarde = evento('tarde', '2026-12-05T18:00:00.000Z');
    const manana = evento('mañana', '2026-12-05T09:00:00.000Z');

    expect(ordenar([tarde, manana])).toEqual(['mañana', 'tarde']);
  });

  it('los eventos borrados no aparecen', () => {
    const vivo = evento('vivo', '2026-12-05T18:00:00.000Z');
    const borrado = evento('borrado', '2026-11-01T18:00:00.000Z', {
      borrado: true,
    });

    expect(ordenar([borrado, vivo])).toEqual(['vivo']);
  });

  it('un evento con una fecha ilegible se va al final sin descolocar al resto', () => {
    const roto = evento('roto', '');
    const enero = evento('enero', '2026-01-05T18:00:00.000Z');
    const marzo = evento('marzo', '2026-03-05T18:00:00.000Z');

    expect(ordenar([marzo, roto, enero])).toEqual(['enero', 'marzo', 'roto']);
  });
});
