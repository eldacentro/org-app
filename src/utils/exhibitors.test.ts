import { describe, expect, it } from 'vitest';
import { ExhibitorSettingsType } from '@definition/exhibitors';
import {
  getEffectiveTurnsForMonth,
  getMonthCancelledMessage,
  getMyExhibitorTurns,
  isMonthCancelled,
  normalizeExhibitorSettings,
} from './exhibitors';

/**
 * Forma de los ajustes de exhibidores.
 *
 * `locations` y `monthlyOverrides` viajaban SIN cifrar. Al meterlos en el mapa
 * de cifrado, un dispositivo que todavía tenga la versión anterior no sabe
 * descifrarlos y se queda con la cadena cifrada tal cual — una lista de
 * ubicaciones pasaría a ser un texto, y `.map` sobre un texto rompe la página.
 * Esto fija que la aplicación aguante cualquier forma que le llegue.
 */

const build = (extra: Partial<ExhibitorSettingsType> = {}) =>
  ({
    weekOf: 'settings',
    turns: [],
    locations: [],
    responsibles: [],
    fixedAssignments: [],
    availability: {},
    ...extra,
  }) as ExhibitorSettingsType;

describe('normalizar la forma de los ajustes', () => {
  it('una lista que llega como texto cifrado se queda vacía, no rompe', () => {
    const settings = build({
      locations: 'U2FsdGVkX1+abc123==' as unknown as string[],
    });

    const result = normalizeExhibitorSettings(settings);

    expect(result.locations).toEqual([]);
    // Lo que de verdad importa: se puede recorrer sin reventar.
    expect(() => result.locations.map((l) => l)).not.toThrow();
  });

  it('los ajustes mensuales cifrados se quedan vacíos', () => {
    const settings = build({
      monthlyOverrides: 'U2FsdGVkX1+xyz==' as unknown as Record<string, never>,
    });

    expect(normalizeExhibitorSettings(settings).monthlyOverrides).toEqual({});
  });

  it('no toca lo que ya tiene la forma correcta', () => {
    const settings = build({
      locations: ['Mercado', 'Estación'],
      turns: [{ id: 't1' }] as never,
      publishedMonths: ['2026/09'],
      monthlyOverrides: { '2026/09': { isCancelledMonth: true } },
    });

    const result = normalizeExhibitorSettings(settings);

    expect(result.locations).toEqual(['Mercado', 'Estación']);
    expect(result.publishedMonths).toEqual(['2026/09']);
    expect(result.monthlyOverrides).toEqual({
      '2026/09': { isCancelledMonth: true },
    });
  });

  it('rellena lo que falta', () => {
    const settings = { weekOf: 'settings' } as ExhibitorSettingsType;

    const result = normalizeExhibitorSettings(settings);

    expect(result.turns).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.responsibles).toEqual([]);
    expect(result.fixedAssignments).toEqual([]);
    expect(result.publishedMonths).toEqual([]);
    expect(result.availability).toEqual({});
  });

  it('un array donde se espera un objeto también se corrige', () => {
    const settings = build({
      availability: [] as unknown as Record<string, string[]>,
    });

    expect(normalizeExhibitorSettings(settings).availability).toEqual({});
  });

  it('deja monthlyOverrides sin definir si no venía', () => {
    // Distinto de "venía con mala forma": si no está, no se inventa.
    expect(normalizeExhibitorSettings(build()).monthlyOverrides).toBeUndefined();
  });
});

describe('los ajustes del mes aguantan una forma inesperada', () => {
  // Aunque normalizar es la primera defensa, estas tres funciones las llama
  // TODO el mundo (programa semanal, "Mis asignaciones", notificaciones).
  const roto = build({
    turns: [{ id: 't1' }] as never,
    monthlyOverrides: 'U2FsdGVkX1+abc==' as unknown as Record<string, never>,
  });

  it('sin ajustes del mes legibles, valen los turnos globales', () => {
    const settings = normalizeExhibitorSettings(roto);

    expect(getEffectiveTurnsForMonth(settings, '2026/09')).toEqual([
      { id: 't1' },
    ]);
  });

  it('no da un mes por suspendido sin poder leerlo', () => {
    const settings = normalizeExhibitorSettings(roto);

    expect(isMonthCancelled(settings, '2026/09')).toBe(false);
    expect(getMonthCancelledMessage(settings, '2026/09')).toBe('');
  });
});

/**
 * Una semana que cruza dos meses.
 *
 * Esta función alimenta a la vez "Mis asignaciones", el contador del panel y
 * las notificaciones. Decidía el mes por el LUNES de la semana y lo aplicaba a
 * los siete días, así que del 31 de agosto al 6 de septiembre todo contaba
 * como agosto. Eso se lleva por delante los tres estados que dependen del mes:
 * si está suspendido, qué turnos rigen y si está publicado.
 */
describe('una semana que cae entre dos meses', () => {
  // Lunes 31 de agosto de 2026 → domingo 6 de septiembre.
  const LUNES = new Date(2026, 7, 31, 12, 0, 0);

  const conTurnoDiario = (extra: Partial<ExhibitorSettingsType> = {}) =>
    build({
      turns: [
        {
          id: 't1',
          days: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
          ],
          startTime: '10:00',
          endTime: '12:00',
          locations: [],
          defaultLocation: 'Mercado',
        },
      ],
      fixedAssignments: [
        { turnId: 't1', personUid: 'yo', isResponsible: false },
      ],
      ...extra,
    });

  const turnos = (settings: ExhibitorSettingsType) =>
    getMyExhibitorTurns(
      [],
      settings,
      'yo',
      LUNES,
      '2026/08/31',
      '2026/09/06'
    ).map((t) => t.date);

  it('los días de un mes en borrador NO salen, aunque el lunes sea de otro mes', () => {
    // Agosto es histórico (publicado); septiembre está en borrador.
    const result = turnos(conTurnoDiario());

    expect(result).toEqual(['2026/08/31']);
  });

  it('al publicar septiembre salen también sus días', () => {
    const result = turnos(conTurnoDiario({ publishedMonths: ['2026/09'] }));

    expect(result).toEqual([
      '2026/08/31',
      '2026/09/01',
      '2026/09/02',
      '2026/09/03',
      '2026/09/04',
      '2026/09/05',
      '2026/09/06',
    ]);
  });

  it('un mes suspendido no arrastra al mes siguiente', () => {
    // Agosto está suspendido de verdad en la congregación. Con el lunes
    // mandando, esta semana entera desaparecía — incluida la de septiembre.
    const result = turnos(
      conTurnoDiario({
        publishedMonths: ['2026/09'],
        monthlyOverrides: { '2026/08': { isCancelledMonth: true } },
      })
    );

    expect(result).toEqual([
      '2026/09/01',
      '2026/09/02',
      '2026/09/03',
      '2026/09/04',
      '2026/09/05',
      '2026/09/06',
    ]);
  });
});
