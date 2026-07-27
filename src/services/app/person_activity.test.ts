import { describe, expect, it } from 'vitest';
import { CircuitVisitType } from '@definition/circuit_visit';
import { DeptWeekType } from '@definition/departments_schedule';
import { ExhibitorWeekType } from '@definition/exhibitors';
import { ServiceOutingWeekType } from '@definition/service_outings';
import {
  buildCircuitVisitActivity,
  buildDepartmentActivity,
  buildExhibitorActivity,
  buildOutingActivity,
  groupActivityByMonth,
  sortActivity,
} from './person_activity';

/**
 * La actividad de una persona, reunida de todos los módulos.
 *
 * Cada módulo guarda sus asignaciones de una forma distinta y todas son
 * estructuras anidadas: un campo mal leído no da error, simplemente deja de
 * encontrar asignaciones — y en la ficha eso se ve como "este hermano no hace
 * nada", que es exactamente la conclusión equivocada.
 */

const YO = 'uid-yo';
const OTRO = 'uid-otro';

const dept = (
  weekOf: string,
  overrides: Partial<Record<string, unknown>> = {}
) =>
  ({
    weekOf,
    acomodadores: { exterior: { value: '' }, interior: { value: '' } },
    microfonos: { micro1: { value: '' }, micro2: { value: '' } },
    multimedia: { video: { value: '' }, audio: { value: '' } },
    plataforma: { encargado: { value: '' } },
    ...overrides,
  }) as DeptWeekType;

describe('departamentos', () => {
  it('encuentra el turno en cualquiera de los cuatro departamentos', () => {
    const weeks = [
      dept('2026/07/06', { microfonos: { micro1: { value: YO }, micro2: { value: OTRO } } }),
      dept('2026/07/13', { plataforma: { encargado: { value: YO } } }),
      dept('2026/07/20', { multimedia: { video: { value: OTRO }, audio: { value: YO } } }),
    ];

    const items = buildDepartmentActivity(weeks, YO);

    expect(items.map((i) => i.title)).toEqual([
      'Micrófono 1',
      'Plataforma',
      'Audio',
    ]);
  });

  it('no se lleva los turnos de otra persona', () => {
    const weeks = [dept('2026/07/06', { microfonos: { micro1: { value: OTRO }, micro2: { value: OTRO } } })];

    expect(buildDepartmentActivity(weeks, YO)).toHaveLength(0);
  });

  it('un turno de departamento vale para toda la semana', () => {
    const weeks = [dept('2026/07/06', { plataforma: { encargado: { value: YO } } })];

    expect(buildDepartmentActivity(weeks, YO)[0]).toMatchObject({
      date: '2026/07/06',
      wholeWeek: true,
    });
  });

  it('una semana a medio guardar no rompe la lista', () => {
    const weeks = [{ weekOf: '2026/07/06' } as DeptWeekType, dept('2026/07/13', { plataforma: { encargado: { value: YO } } })];

    expect(buildDepartmentActivity(weeks, YO)).toHaveLength(1);
  });
});

describe('salidas de predicación', () => {
  const week = (outings: unknown[]) =>
    ({ weekOf: '2026/07/06', outings }) as ServiceOutingWeekType;

  it('recoge la salida con su hora y su sitio', () => {
    const items = buildOutingActivity(
      [
        week([
          {
            id: 'o1',
            date: '2026/07/07',
            time: '10:00',
            person: YO,
            location: 'Salón del Reino',
            cancelled: false,
          },
        ]),
      ],
      YO
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      date: '2026/07/07',
      title: 'Salida de predicación',
      detail: '10:00 · Salón del Reino',
    });
  });

  it('una salida anulada no cuenta como asignación', () => {
    const items = buildOutingActivity(
      [week([{ id: 'o1', date: '2026/07/07', time: '10:00', person: YO, location: '', cancelled: true }])],
      YO
    );

    expect(items).toHaveLength(0);
  });

  it('una semana sin salidas guardadas no rompe nada', () => {
    expect(buildOutingActivity([{ weekOf: '2026/07/06' } as ServiceOutingWeekType], YO)).toEqual([]);
  });
});

describe('exhibidores', () => {
  const week = (turns: unknown[]) =>
    ({ weekOf: '2026/07/06', turns }) as ExhibitorWeekType;

  it('distingue al responsable del turno', () => {
    const items = buildExhibitorActivity(
      [
        week([
          {
            turnId: 't1',
            date: '2026/07/08',
            location: 'Mercado',
            cancelled: false,
            assignments: [
              { person: OTRO, isResponsible: false },
              { person: YO, isResponsible: true },
            ],
          },
        ]),
      ],
      YO
    );

    expect(items[0]).toMatchObject({
      title: 'Exhibidores (responsable)',
      detail: 'Mercado',
      date: '2026/07/08',
    });
  });

  it('un turno anulado no cuenta', () => {
    const items = buildExhibitorActivity(
      [week([{ turnId: 't1', date: '2026/07/08', location: '', cancelled: true, assignments: [{ person: YO, isResponsible: false }] }])],
      YO
    );

    expect(items).toHaveLength(0);
  });
});

describe('visita del superintendente', () => {
  const visit = (overrides: Partial<CircuitVisitType> = {}) =>
    ({
      id: 'v1',
      _deleted: false,
      date_start: '2026/09/01',
      date_end: '2026/09/06',
      weekOf: '2026/08/31',
      meals: [],
      co_companions: [],
      shepherding_visits: [],
      ...overrides,
    }) as CircuitVisitType;

  it('recoge la comida en casa del hermano', () => {
    const items = buildCircuitVisitActivity(
      [visit({ meals: [{ id: 'm1', date: '2026/09/03', host: YO, note: 'En su casa' }] })],
      YO
    );

    expect(items[0]).toMatchObject({
      date: '2026/09/03',
      title: 'Comida con el superintendente',
      detail: 'En su casa',
    });
  });

  it('recoge al acompañante, con la hora y la actividad', () => {
    const items = buildCircuitVisitActivity(
      [
        visit({
          co_companions: [
            {
              outingKey: '2026/09/02_10:00',
              brother: YO,
              withWife: false,
              activity: 'revisitas',
              spouse_companions: [],
            },
          ],
        }),
      ],
      YO
    );

    expect(items[0]).toMatchObject({
      date: '2026/09/02',
      title: 'Acompañó al superintendente',
      detail: '10:00 · Revisitas',
    });
  });

  it('recoge también a quien acompaña a la esposa', () => {
    const items = buildCircuitVisitActivity(
      [
        visit({
          co_companions: [
            {
              outingKey: '2026/09/02_10:00',
              brother: OTRO,
              withWife: true,
              activity: 'predicacion',
              spouse_companions: [YO],
            },
          ],
        }),
      ],
      YO
    );

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Acompañó a la esposa del superintendente');
  });

  it('el anciano que acompaña en el pastoreo sí; el hermano visitado NO', () => {
    const shepherding = {
      id: 's1',
      brother: OTRO,
      elder: YO,
      date: '2026/09/04',
      time: '18:00',
      note: '',
    };

    const comoAcompanante = buildCircuitVisitActivity(
      [visit({ shepherding_visits: [shepherding] })],
      YO
    );
    const comoVisitado = buildCircuitVisitActivity(
      [visit({ shepherding_visits: [shepherding] })],
      OTRO
    );

    expect(comoAcompanante[0].title).toBe('Visita de pastoreo (acompañante)');
    expect(comoVisitado).toHaveLength(0);
  });

  it('si la clave de la salida viene rota, cae a la fecha de la visita', () => {
    const items = buildCircuitVisitActivity(
      [
        visit({
          co_companions: [
            { outingKey: '', brother: YO, withWife: false, activity: 'curso', spouse_companions: [] },
          ],
        }),
      ],
      YO
    );

    expect(items[0].date).toBe('2026/09/01');
  });

  it('una visita borrada no aporta nada', () => {
    const items = buildCircuitVisitActivity(
      [visit({ _deleted: true, meals: [{ id: 'm1', date: '2026/09/03', host: YO, note: '' }] })],
      YO
    );

    expect(items).toHaveLength(0);
  });
});

describe('orden y agrupación', () => {
  const item = (key: string, date: string) =>
    ({ key, date, category: 'meeting', title: key }) as never;

  it('lo más reciente va primero', () => {
    const sorted = sortActivity([
      item('a', '2026/05/01'),
      item('b', '2026/07/01'),
      item('c', '2026/06/01'),
    ]);

    expect(sorted.map((i) => i.key)).toEqual(['b', 'c', 'a']);
  });

  it('agrupa por mes sin mezclar meses iguales de años distintos', () => {
    const groups = groupActivityByMonth(
      sortActivity([
        item('a', '2026/07/02'),
        item('b', '2025/07/02'),
        item('c', '2026/07/20'),
      ])
    );

    expect(groups.map((g) => g.month)).toEqual(['2026/07', '2025/07']);
    expect(groups[0].items.map((i) => i.key)).toEqual(['c', 'a']);
  });
});
