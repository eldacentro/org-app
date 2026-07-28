import { describe, expect, it } from 'vitest';
import { buildWeekRangeLabel } from './week_range';

/**
 * La frase de la semana.
 *
 * Lo que importa aquí es de dónde salen los días: el encabezado del editor de
 * departamentos enseñaba la fecha de la reunión de entre semana en vez de la
 * de la semana, y no había forma de saber de qué semana se estaba hablando.
 */

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

// Simula t(): devuelve la clave y los valores, que es lo que hay que
// comprobar. Cómo se ordenan luego es cosa de la traducción.
const t = (key: string, params?: Record<string, unknown>) =>
  `${key}(${JSON.stringify(params)})`;

const label = (week: string) => buildWeekRangeLabel(week, MESES, t);

describe('la semana va del lunes al domingo', () => {
  it('empieza en el lunes que se le da, no en otro día', () => {
    // Agosto de 2026: el lunes es el 3 y el domingo el 9. La reunión de entre
    // semana cae el 5, que es lo que se enseñaba antes por error.
    expect(label('2026/08/03')).toBe(
      'tr_weekRangeSameMonth({"mondayDay":3,"sundayDay":9,"month":"agosto","year":2026})'
    );
  });

  it('a caballo entre dos meses, dice los dos', () => {
    expect(label('2026/07/27')).toBe(
      'tr_weekRangeSameYear({"mondayDay":27,"mondayMonth":"julio","sundayDay":2,"sundayMonth":"agosto","year":2026})'
    );
  });

  it('a caballo entre dos años, dice los dos años', () => {
    expect(label('2026/12/28')).toBe(
      'tr_weekRangeDiffYear({"mondayDay":28,"mondayMonth":"diciembre","mondayYear":2026,"sundayDay":3,"sundayMonth":"enero","sundayYear":2027})'
    );
  });
});

describe('entradas raras no rompen la pantalla', () => {
  it('sin semana, sin frase', () => {
    expect(label('')).toBe('');
  });

  it('una fecha con otra forma se devuelve tal cual', () => {
    expect(label('2026-08-03')).toBe('2026-08-03');
  });
});
