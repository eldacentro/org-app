import { describe, expect, it } from 'vitest';
import { UpcomingEventType } from '@definition/upcoming_events';
import {
  EVENT_PERIOD_MIN_DAYS,
  eventDayCount,
  eventPeriodProgress,
  isEventPeriod,
} from './upcoming_events';

/**
 * El umbral que separa una CITA de un PERIODO.
 *
 * Está en una prueba y no solo en un comentario porque el filo es exacto: a
 * los 7 días sigue siendo una cita y a los 8 ya no. Y porque de ese lado del
 * umbral viven cosas que no se pueden romper — las asambleas y la visita del
 * superintendente, que tienen su propia agenda y hoy funcionan bien.
 */

const evento = (start: string, end: string): UpcomingEventType =>
  ({
    event_uid: 'x',
    event_data: {
      start,
      end,
      _deleted: false,
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  }) as unknown as UpcomingEventType;

describe('cuántos días abarca un evento', () => {
  it('cuenta los dos extremos', () => {
    expect(eventDayCount(evento('2026/09/01', '2026/09/01'))).toBe(1);
    expect(eventDayCount(evento('2026/09/01', '2026/09/30'))).toBe(30);
  });

  // Los eventos que se crean a mano guardan una hora dentro de la fecha. Lo
  // que cuenta son los días de calendario que toca, no las horas que dura.
  it('no le afecta la hora del día', () => {
    const casiUnDia = evento('2026/09/01 23:30', '2026/09/02 01:00');

    expect(eventDayCount(casiUnDia)).toBe(2);

    const jornadaLarga = evento('2026/09/01 08:00', '2026/09/01 22:00');

    expect(eventDayCount(jornadaLarga)).toBe(1);
  });
});

describe('qué es un periodo y qué es una cita', () => {
  it('el umbral son ocho días', () => {
    expect(EVENT_PERIOD_MIN_DAYS).toBe(8);
  });

  it('siete días todavía es una cita', () => {
    expect(isEventPeriod(evento('2026/09/01', '2026/09/07'))).toBe(false);
  });

  it('ocho días ya es un periodo', () => {
    expect(isEventPeriod(evento('2026/09/01', '2026/09/08'))).toBe(true);
  });

  it('una campaña de un mes es un periodo', () => {
    expect(isEventPeriod(evento('2026/09/01', '2026/09/30'))).toBe(true);
  });

  // Lo que NO puede cambiar: estos dos siguen siendo citas y conservan la
  // agenda por días que ya tienen.
  it('una asamblea de tres días sigue siendo una cita', () => {
    expect(isEventPeriod(evento('2026/09/11', '2026/09/13'))).toBe(false);
  });

  it('la semana del superintendente de circuito sigue siendo una cita', () => {
    expect(isEventPeriod(evento('2026/09/07', '2026/09/12'))).toBe(false);
  });

  it('un evento de un solo día, obviamente, es una cita', () => {
    expect(isEventPeriod(evento('2026/09/15', '2026/09/15'))).toBe(false);
  });
});

describe('en qué momento está un periodo', () => {
  const campana = evento('2026/09/01', '2026/09/30');

  it('antes de empezar dice cuántos días faltan', () => {
    expect(eventPeriodProgress(campana, new Date(2026, 7, 27))).toEqual({
      state: 'upcoming',
      days: 5,
    });
  });

  it('el primer día ya cuenta como empezado', () => {
    expect(eventPeriodProgress(campana, new Date(2026, 8, 1))).toEqual({
      state: 'running',
      days: 29,
    });
  });

  it('a mitad dice lo que queda', () => {
    expect(eventPeriodProgress(campana, new Date(2026, 8, 18))).toEqual({
      state: 'running',
      days: 12,
    });
  });

  it('el último día no dice "quedan 0 días"', () => {
    expect(eventPeriodProgress(campana, new Date(2026, 8, 30))).toEqual({
      state: 'lastDay',
      days: 0,
    });
  });

  it('cuando ha terminado lo dice', () => {
    expect(eventPeriodProgress(campana, new Date(2026, 9, 1))).toEqual({
      state: 'finished',
      days: 0,
    });
  });

  // El cambio de hora de octubre mete o quita una hora en el mes: contando en
  // milisegundos sin redondear, «quedan 12 días» se convertía en 11.
  it('el cambio de hora no descuadra la cuenta', () => {
    const octubre = evento('2026/10/01', '2026/10/31');

    expect(eventPeriodProgress(octubre, new Date(2026, 9, 20))).toEqual({
      state: 'running',
      days: 11,
    });
  });
});
