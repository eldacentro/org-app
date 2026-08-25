import { describe, it, expect } from 'vitest';
import { PALETA_COLORES, repartirPaleta } from './paleta';

/**
 * El reparto de colores toca DATOS de la congregación: los colores de las
 * zonas, que son lo que hace legible el mapa. Dos zonas con el mismo color no
 * es un fallo que se vea en una pantalla de prueba — se ve el sábado, con el
 * mapa en la mano y noventa territorios pintados.
 */
describe('repartir la paleta entre colores antiguos', () => {
  it('no toca lo que ya está en la paleta', () => {
    const zonas = [
      { id: 'a', color: PALETA_COLORES[0] },
      { id: 'b', color: PALETA_COLORES[3] },
    ];

    expect(repartirPaleta(zonas)).toEqual([]);
  });

  it('lleva cada color al más parecido', () => {
    // Un azul y un rojo cualesquiera, de la paleta vieja.
    const cambios = repartirPaleta([
      { id: 'azul', color: '#6366F1' },
      { id: 'rojo', color: '#EF4444' },
    ]);

    const porId = Object.fromEntries(cambios.map((c) => [c.id, c.color]));
    expect(porId.azul).toBe('#6E65C5');
    expect(porId.rojo).toBe('#BA4B47');
  });

  it('NUNCA le da el mismo color a dos', () => {
    // Tres verdes casi iguales: si cada uno se llevara "el más parecido" sin
    // mirar a los demás, los tres acabarían con el mismo y en el mapa se
    // fundirían en uno.
    const cambios = repartirPaleta([
      { id: 'v1', color: '#10B981' },
      { id: 'v2', color: '#14B8A6' },
      { id: 'v3', color: '#22C55E' },
    ]);

    const colores = cambios.map((c) => c.color);
    expect(new Set(colores).size).toBe(3);
    colores.forEach((c) => expect(PALETA_COLORES).toContain(c));
  });

  it('respeta los que ya estaban al repartir los que no', () => {
    // El esmeralda ya está cogido: el verde de al lado tiene que buscarse otro.
    const cambios = repartirPaleta([
      { id: 'fijo', color: '#008A63' },
      { id: 'parecido', color: '#10B981' },
    ]);

    expect(cambios).toHaveLength(1);
    expect(cambios[0].color).not.toBe('#008A63');
  });

  it('con más elementos que colores, no se queda sin repartir', () => {
    const muchos = Array.from({ length: 13 }, (_, i) => ({
      id: `z${i}`,
      color: `#${(i * 1234567).toString(16).padStart(6, '0').slice(0, 6)}`,
    }));

    const cambios = repartirPaleta(muchos);
    expect(cambios).toHaveLength(13);
    cambios.forEach((c) => expect(PALETA_COLORES).toContain(c.color));
  });
});
