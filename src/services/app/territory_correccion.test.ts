import { describe, expect, it } from 'vitest';
import { fechaTrasCorregirEntrega } from './territories';

// Fechas de devolución de ejemplo, de más antigua a más reciente.
const ENERO = '2026-01-15T10:00:00.000Z';
const MARZO = '2026-03-10T10:00:00.000Z';
const MAYO = '2026-05-20T10:00:00.000Z';

describe('fechaTrasCorregirEntrega', () => {
  it('a trabajado: un territorio sin fecha toma la de la entrega', () => {
    expect(fechaTrasCorregirEntrega(null, MAYO, 'trabajado', [])).toBe(MAYO);
  });

  it('a trabajado: avanza si la entrega es más reciente', () => {
    expect(fechaTrasCorregirEntrega(MARZO, MAYO, 'trabajado', [])).toBe(MAYO);
  });

  it('a trabajado: nunca retrocede una fecha más reciente', () => {
    // Otro lo trabajó después; corregir una entrega vieja no puede hacer
    // que el territorio parezca menos trabajado.
    expect(fechaTrasCorregirEntrega(MAYO, ENERO, 'trabajado', [])).toBe(MAYO);
  });

  it('a sin trabajar: vuelve a la última entrega trabajada que queda', () => {
    expect(
      fechaTrasCorregirEntrega(MAYO, MAYO, 'no_trabajado', [ENERO, MARZO])
    ).toBe(MARZO);
  });

  it('a sin trabajar: sin otras entregas trabajadas se queda sin fecha', () => {
    expect(fechaTrasCorregirEntrega(MAYO, MAYO, 'no_trabajado', [])).toBe(null);
  });

  it('a sin trabajar: no toca una fecha que no es de esta entrega', () => {
    // La fecha es de otra entrega posterior.
    expect(fechaTrasCorregirEntrega(MAYO, MARZO, 'no_trabajado', [MAYO])).toBe(
      MAYO
    );
    // O vino importada de Territory Helper, sin asignación detrás.
    expect(
      fechaTrasCorregirEntrega(
        '2025-11-02T00:00:00.000Z',
        ENERO,
        'no_trabajado',
        []
      )
    ).toBe('2025-11-02T00:00:00.000Z');
  });

  it('ida y vuelta: trabajado y luego sin trabajar deja lo que había', () => {
    const tras1 = fechaTrasCorregirEntrega(MARZO, MAYO, 'trabajado', []);
    expect(tras1).toBe(MAYO);
    expect(fechaTrasCorregirEntrega(tras1, MAYO, 'no_trabajado', [MARZO])).toBe(
      MARZO
    );
  });
});
