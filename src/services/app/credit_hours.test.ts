import { describe, expect, it } from 'vitest';
import {
  effectiveCreditHours,
  monthlyCreditedTotal,
  rawCreditHours,
} from './credit_hours';

/**
 * Las horas de crédito.
 *
 * Los tres primeros casos son LITERALMENTE los ejemplos que dio el secretario
 * el 2026-08-20, con sus números. Están aquí para que nadie tenga que volver a
 * preguntarle: si alguien cambia la regla, estos tres lo cantan.
 */

describe('los tres ejemplos del secretario', () => {
  it('67 h + 15 de crédito = 67 (la predicación ya pasó de 55, y cuenta entera)', () => {
    expect(monthlyCreditedTotal(67, 15)).toBe(67);
    expect(effectiveCreditHours(67, 15)).toBe(0);
  });

  it('40 h + 20 de crédito = 55 (se pierden 5 de crédito)', () => {
    expect(monthlyCreditedTotal(40, 20)).toBe(55);
    expect(effectiveCreditHours(40, 20)).toBe(15);
  });

  it('20 h + 20 de crédito = 40 (no llegan a 55, cuenta todo)', () => {
    expect(monthlyCreditedTotal(20, 20)).toBe(40);
    expect(effectiveCreditHours(20, 20)).toBe(20);
  });
});

describe('los bordes', () => {
  it('justo en 55 de predicación, el crédito ya no suma', () => {
    expect(effectiveCreditHours(55, 10)).toBe(0);
    expect(monthlyCreditedTotal(55, 10)).toBe(55);
  });

  it('sin crédito, el total es la predicación', () => {
    expect(monthlyCreditedTotal(42, 0)).toBe(42);
    expect(monthlyCreditedTotal(70, 0)).toBe(70);
  });

  it('sin predicación, el crédito cuenta hasta 55', () => {
    expect(effectiveCreditHours(0, 80)).toBe(55);
    expect(monthlyCreditedTotal(0, 80)).toBe(55);
  });

  it('la predicación NUNCA se recorta', () => {
    // El tope es solo para el crédito. Recortar predicación sería falsear el
    // informe que se manda a la sucursal.
    expect(monthlyCreditedTotal(120, 0)).toBe(120);
    expect(monthlyCreditedTotal(120, 30)).toBe(120);
  });

  it('números raros no rompen nada', () => {
    expect(effectiveCreditHours(-5, 10)).toBe(10);
    expect(effectiveCreditHours(10, -5)).toBe(0);
    expect(effectiveCreditHours(NaN, NaN)).toBe(0);
  });
});

describe('de qué campo sale el crédito apuntado', () => {
  it('manda lo aprobado por el comité', () => {
    expect(rawCreditHours({ value: 3, approved: 8 })).toBe(8);
  });

  it('sin aprobación, lo apuntado', () => {
    expect(rawCreditHours({ value: 3, approved: 0 })).toBe(3);
  });

  it('sin nada, cero', () => {
    expect(rawCreditHours({})).toBe(0);
  });
});

describe('el caso real de Claudia (año de servicio 2025-2026)', () => {
  it('de 35 horas de crédito apuntadas solo cuentan las que caben', () => {
    // Lo que la aplicación sumaba: 8+6+8+7+6 = 35, en bruto.
    // Lo que de verdad cuenta, mes a mes con el tope de 55:
    const meses: [number, number][] = [
      [47, 8], // septiembre: 47+8 = 55 justo, entran las 8
      [42, 6], // noviembre: 42+6 = 48, entran las 6
      [60, 8], // enero: ya pasa de 55, no entra ninguna
      [57, 7], // febrero: igual
      [55, 6], // abril: justo en 55, no entra ninguna
    ];

    const bruto = meses.reduce((acc, [, c]) => acc + c, 0);
    const real = meses.reduce(
      (acc, [campo, cred]) => acc + effectiveCreditHours(campo, cred),
      0
    );

    expect(bruto).toBe(35);
    expect(real).toBe(14);
  });
});
