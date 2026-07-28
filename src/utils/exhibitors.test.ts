import { describe, expect, it } from 'vitest';
import { ExhibitorSettingsType } from '@definition/exhibitors';
import {
  getEffectiveTurnsForMonth,
  getMonthCancelledMessage,
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
