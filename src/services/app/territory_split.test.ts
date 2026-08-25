import { describe, it, expect } from 'vitest';
import { cortarPoligono, cortarTerritorio, Pos } from './territory_split';
import { MultiPolygon, Polygon } from '@definition/territories';

/**
 * Lo que se comprueba aquí es UNA cosa: que al partir un territorio no se
 * pierda terreno. Un corte que se coma una manzana no da error —da dos
 * trozos con buena pinta— y nadie lo notaría hasta que alguien no llamara a
 * esas puertas.
 *
 * Las formas son de mentira a propósito, pero los casos son los que salen en
 * los KML de verdad: territorios en L, en C, con un patio dentro y partidos
 * en trozos sueltos.
 */

const poli = (...anillos: Pos[][]): Polygon => ({
  type: 'Polygon',
  coordinates: anillos,
});

const cuadrado: Pos[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

const area = (anillo: Pos[]): number => {
  let suma = 0;
  for (let i = 0; i < anillo.length - 1; i += 1) {
    suma += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1];
  }
  return Math.abs(suma) / 2;
};

const areaDe = (p: Polygon): number => {
  const [exterior, ...huecos] = p.coordinates as Pos[][];
  return huecos.reduce((t, h) => t - area(h), area(exterior));
};

describe('cortarPoligono', () => {
  it('parte un cuadrado en dos mitades iguales', () => {
    const r = cortarPoligono(poli(cuadrado), [
      [5, -5],
      [5, 15],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(areaDe(r.piezas[0])).toBeCloseTo(50, 6);
    expect(areaDe(r.piezas[1])).toBeCloseTo(50, 6);
  });

  it('no pierde nada aunque la raya vaya torcida y quebrada', () => {
    const r = cortarPoligono(poli(cuadrado), [
      [-2, 1],
      [4, 6],
      [7, 3],
      [12, 9],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(areaDe(r.piezas[0]) + areaDe(r.piezas[1])).toBeCloseTo(100, 6);
  });

  it('vale con que la raya se quede dentro: se prolonga sola', () => {
    // Nadie traza con el dedo un palmo por fuera del territorio.
    const r = cortarPoligono(poli(cuadrado), [
      [5, 2],
      [5, 8],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(areaDe(r.piezas[0]) + areaDe(r.piezas[1])).toBeCloseTo(100, 6);
  });

  it('cuenta una sola vez la raya que pasa justo por una esquina', () => {
    // La diagonal toca dos vértices; cada uno pertenece a dos lados, así que
    // sin quitar repetidos parecería que cruza cuatro veces.
    const r = cortarPoligono(poli(cuadrado), [
      [-5, -5],
      [15, 15],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(areaDe(r.piezas[0])).toBeCloseTo(50, 6);
    expect(areaDe(r.piezas[1])).toBeCloseTo(50, 6);
  });

  it('parte un territorio en L', () => {
    const ele: Pos[] = [
      [0, 0],
      [10, 0],
      [10, 4],
      [4, 4],
      [4, 10],
      [0, 10],
      [0, 0],
    ];
    // Por x=7, que cruza el brazo de abajo. Trazar la raya justo ENCIMA de
    // un lado del territorio (aquí, y=4) no vale: uno de los dos trozos
    // saldría con área cero, y eso se rechaza.
    const r = cortarPoligono(poli(ele), [
      [7, -2],
      [7, 12],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(areaDe(r.piezas[0]) + areaDe(r.piezas[1])).toBeCloseTo(area(ele), 6);
  });

  it('rechaza la raya que entra y sale varias veces', () => {
    // Una U: la raya recta atraviesa los dos brazos, cuatro cruces, y
    // saldrían tres trozos en vez de dos. Se pide otro corte en vez de
    // inventarse el reparto.
    const u: Pos[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [7, 10],
      [7, 3],
      [3, 3],
      [3, 10],
      [0, 10],
      [0, 0],
    ];
    const r = cortarPoligono(poli(u), [
      [-2, 6],
      [12, 6],
    ]);

    expect(r).toEqual({ ok: false, motivo: 'CRUZA_DE_MAS' });
  });

  it('rechaza la raya que no llega a cruzar', () => {
    const r = cortarPoligono(poli(cuadrado), [
      [-5, 20],
      [15, 20],
    ]);

    expect(r).toEqual({ ok: false, motivo: 'NO_CRUZA' });
  });

  it('deja el patio de dentro en el trozo que le toca', () => {
    const patio: Pos[] = [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ];
    const r = cortarPoligono(poli(cuadrado, patio), [
      [2, -5],
      [2, 15],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const conPatio = r.piezas.filter((p) => p.coordinates.length === 2);
    expect(conPatio).toHaveLength(1);
    // Y el patio sigue sin contar como territorio.
    expect(areaDe(r.piezas[0]) + areaDe(r.piezas[1])).toBeCloseTo(100 - 4, 6);
  });

  it('rechaza la raya que pasa por encima de un patio', () => {
    const patio: Pos[] = [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ];
    const r = cortarPoligono(poli(cuadrado, patio), [
      [5, -5],
      [5, 15],
    ]);

    expect(r).toEqual({ ok: false, motivo: 'CORTA_UN_HUECO' });
  });
});

describe('cortarTerritorio (varios trozos sueltos)', () => {
  const dosTrozos: MultiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
      [cuadrado],
      [
        [
          [20, 0],
          [24, 0],
          [24, 4],
          [20, 4],
          [20, 0],
        ],
      ],
    ],
  };

  it('corta el trozo que cruza y coloca el suelto en el más cercano', () => {
    const r = cortarTerritorio(dosTrozos, [
      [5, -5],
      [5, 15],
    ]);

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // El trozo suelto se va con la mitad derecha, que es la que le pilla al
    // lado; y entre las dos piezas siguen estando los 116 de siempre.
    const total = r.piezas
      .map((p) =>
        p.type === 'Polygon'
          ? areaDe(p)
          : p.coordinates.reduce(
              (t, c) => t + areaDe({ type: 'Polygon', coordinates: c }),
              0
            )
      )
      .reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100 + 16, 6);
  });

  it('no corta si la raya atraviesa dos trozos sueltos a la vez', () => {
    const r = cortarTerritorio(dosTrozos, [
      [-5, 2],
      [30, 2],
    ]);

    expect(r).toEqual({ ok: false, motivo: 'CRUZA_VARIAS_PARTES' });
  });
});
