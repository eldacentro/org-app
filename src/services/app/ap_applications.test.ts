import { describe, expect, it } from 'vitest';
import {
  horasDeLaSolicitud,
  mesesDe15Horas,
  mesesDeLaSolicitud,
  puedeElegir15Horas,
  solicitudesRepetidas,
} from './ap_applications';

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

describe('las horas que pide una solicitud', () => {
  it('15 cuando se piden 15', () => {
    expect(horasDeLaSolicitud({ hours: 15 })).toBe(15);
  });

  it('30 cuando se piden 30', () => {
    expect(horasDeLaSolicitud({ hours: 30 })).toBe(30);
  });

  it('una solicitud de antes del campo son 30, no un hueco', () => {
    expect(horasDeLaSolicitud({})).toBe(30);
    expect(horasDeLaSolicitud(undefined)).toBe(30);
    expect(horasDeLaSolicitud(null)).toBe(30);
  });

  it('cualquier otra cosa se lee como 30', () => {
    expect(horasDeLaSolicitud({ hours: 0 as never })).toBe(30);
    expect(horasDeLaSolicitud({ hours: '15' as never })).toBe(30);
    expect(horasDeLaSolicitud({ hours: 20 as never })).toBe(30);
  });
});

describe('los meses en que se puede hacer con 15 horas', () => {
  const año = (year: string, months: string[], _deleted = false) => ({
    year,
    months,
    _deleted,
    updatedAt: '2026-09-19T10:00:00.000Z',
  });

  it('junta los meses de todos los años de servicio, ordenados y sin repetir', () => {
    expect(
      mesesDe15Horas([
        año('2027', ['2026/10', '2026/12']),
        año('2026', ['2026/04']),
        año('2028', ['2026/10']),
      ])
    ).toEqual(['2026/04', '2026/10', '2026/12']);
  });

  it('un año borrado no cuenta', () => {
    expect(mesesDe15Horas([año('2027', ['2026/10'], true)])).toEqual([]);
  });

  it('sin configuración, ninguno — y no revienta', () => {
    expect(mesesDe15Horas([])).toEqual([]);
    expect(mesesDe15Horas(undefined)).toEqual([]);
    expect(mesesDe15Horas(null)).toEqual([]);
    expect(mesesDe15Horas('U2FsdGVkX18=' as never)).toEqual([]);
    expect(mesesDe15Horas([null as never, año('2027', null as never)])).toEqual(
      []
    );
  });

  it('descarta un mes con mala forma en vez de colarlo', () => {
    expect(mesesDe15Horas([año('2027', ['octubre', '2026/10'])])).toEqual([
      '2026/10',
    ]);
  });
});

describe('cuándo la solicitud deja elegir entre 15 y 30', () => {
  const DE15 = ['2026/10', '2026/12'];

  it('sí cuando el mes pedido es de 15 horas', () => {
    expect(
      puedeElegir15Horas({ months: ['2026/10'], continuous: false }, DE15)
    ).toBe(true);
  });

  it('no cuando el mes pedido no lo es', () => {
    expect(
      puedeElegir15Horas({ months: ['2026/11'], continuous: false }, DE15)
    ).toBe(false);
  });

  it('con varios meses tienen que serlo TODOS', () => {
    expect(
      puedeElegir15Horas(
        { months: ['2026/10', '2026/12'], continuous: false },
        DE15
      )
    ).toBe(true);

    // Diciembre sí, noviembre no: elegir 15 diría que noviembre también vale.
    expect(
      puedeElegir15Horas(
        { months: ['2026/11', '2026/12'], continuous: false },
        DE15
      )
    ).toBe(false);
  });

  it('«de continuo» nunca: no se sabe qué meses vendrán', () => {
    expect(
      puedeElegir15Horas({ months: ['2026/10'], continuous: true }, DE15)
    ).toBe(false);
  });

  it('sin meses elegidos todavía, no hay nada que decidir', () => {
    expect(puedeElegir15Horas({ months: [], continuous: false }, DE15)).toBe(
      false
    );
    expect(puedeElegir15Horas(undefined, DE15)).toBe(false);
    expect(
      puedeElegir15Horas({ months: ['2026/10'], continuous: false }, [])
    ).toBe(false);
  });
});
