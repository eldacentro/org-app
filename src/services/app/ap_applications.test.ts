import { describe, expect, it } from 'vitest';
import { mesesDeLaSolicitud, solicitudesRepetidas } from './ap_applications';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const solicitud = (
  request_id: string,
  person_uid: string,
  months: string[],
  submitted: string,
  continuous = false
) => ({ request_id, person_uid, months, submitted, continuous });

describe('solicitudes de precursorado auxiliar repetidas', () => {
  it('marca la segunda, nunca la primera', () => {
    const repetidas = solicitudesRepetidas([
      solicitud('b', 'ana', ['2026/10'], '2026-09-18T10:01:00.000Z'),
      solicitud('a', 'ana', ['2026/10'], '2026-09-18T10:00:00.000Z'),
    ]);

    expect([...repetidas]).toEqual(['b']);
  });

  it('dos hermanos que piden el mismo mes no son una repetición', () => {
    const repetidas = solicitudesRepetidas([
      solicitud('a', 'ana', ['2026/10'], '2026-09-18T10:00:00.000Z'),
      solicitud('b', 'luis', ['2026/10'], '2026-09-18T10:01:00.000Z'),
    ]);

    expect(repetidas.size).toBe(0);
  });

  it('el mismo hermano pidiendo otro mes tampoco', () => {
    const repetidas = solicitudesRepetidas([
      solicitud('a', 'ana', ['2026/10'], '2026-09-01T10:00:00.000Z'),
      solicitud('b', 'ana', ['2026/11'], '2026-10-01T10:00:00.000Z'),
    ]);

    expect(repetidas.size).toBe(0);
  });

  it('basta con que compartan un mes', () => {
    const repetidas = solicitudesRepetidas([
      solicitud('a', 'ana', ['2026/10', '2026/11'], '2026-09-01T10:00:00.000Z'),
      solicitud('b', 'ana', ['2026/11', '2026/12'], '2026-09-02T10:00:00.000Z'),
    ]);

    expect([...repetidas]).toEqual(['b']);
  });

  it('una continua cubre de su mes en adelante', () => {
    const repetidas = solicitudesRepetidas([
      solicitud('a', 'ana', ['2026/10'], '2026-09-01T10:00:00.000Z', true),
      solicitud('b', 'ana', ['2026/12'], '2026-09-02T10:00:00.000Z'),
      solicitud('c', 'ana', ['2026/09'], '2026-09-03T10:00:00.000Z'),
    ]);

    // Diciembre cae dentro de «desde octubre»; septiembre, no.
    expect([...repetidas]).toEqual(['b']);
  });

  it('tres iguales: sobran dos', () => {
    const repetidas = solicitudesRepetidas([
      solicitud('a', 'ana', ['2026/10'], '2026-09-18T10:00:00.000Z'),
      solicitud('b', 'ana', ['2026/10'], '2026-09-18T10:00:05.000Z'),
      solicitud('c', 'ana', ['2026/10'], '2026-09-18T10:00:09.000Z'),
    ]);

    expect([...repetidas].sort()).toEqual(['b', 'c']);
  });

  it('enviadas en el mismo instante: sobra una, y siempre la misma', () => {
    const una = solicitud('x2', 'ana', ['2026/10'], '2026-09-18T10:00:00.000Z');
    const otra = solicitud(
      'x1',
      'ana',
      ['2026/10'],
      '2026-09-18T10:00:00.000Z'
    );

    expect([...solicitudesRepetidas([una, otra])]).toEqual(['x2']);
    expect([...solicitudesRepetidas([otra, una])]).toEqual(['x2']);
  });

  it('sin meses o sin lista no revienta', () => {
    expect(
      solicitudesRepetidas([
        solicitud('a', 'ana', [], '2026-09-18T10:00:00.000Z'),
        solicitud('b', 'ana', undefined as never, '2026-09-18T10:01:00.000Z'),
      ]).size
    ).toBe(0);
    expect(solicitudesRepetidas(undefined as never).size).toBe(0);
  });
});

describe('los meses de una solicitud, para leerlos', () => {
  const hoy = new Date(2026, 8, 19);

  it('un mes', () => {
    expect(
      mesesDeLaSolicitud({ months: ['2026/10'], continuous: false }, MESES, hoy)
    ).toBe('octubre');
  });

  it('dos y tres, ordenados aunque lleguen desordenados', () => {
    expect(
      mesesDeLaSolicitud(
        { months: ['2026/11', '2026/10'], continuous: false },
        MESES,
        hoy
      )
    ).toBe('octubre y noviembre');
    expect(
      mesesDeLaSolicitud(
        { months: ['2026/12', '2026/10', '2026/11'], continuous: false },
        MESES,
        hoy
      )
    ).toBe('octubre, noviembre y diciembre');
  });

  it('continua', () => {
    expect(
      mesesDeLaSolicitud({ months: ['2026/10'], continuous: true }, MESES, hoy)
    ).toBe('desde octubre');
  });

  it('el año solo cuando no es el de hoy', () => {
    expect(
      mesesDeLaSolicitud(
        { months: ['2026/12', '2027/01'], continuous: false },
        MESES,
        hoy
      )
    ).toBe('diciembre y enero de 2027');
  });

  it('sin meses, nada', () => {
    expect(
      mesesDeLaSolicitud({ months: [], continuous: false }, MESES, hoy)
    ).toBe('');
    expect(
      mesesDeLaSolicitud(
        { months: undefined as never, continuous: false },
        MESES,
        hoy
      )
    ).toBe('');
  });
});
