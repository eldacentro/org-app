import { describe, it, expect } from 'vitest';
import { serializeSecciones, parseSecciones } from './territories';
import { TerritorySection } from '@definition/territories';

/**
 * Los trozos de un territorio llevan un polígono, y un polígono GeoJSON es un
 * array dentro de otro array. Firestore no admite eso: rechaza el documento
 * ENTERO, y lo que se ve por pantalla es "no se ha podido guardar, comprueba
 * tu conexión" —con conexión de sobra—. Por eso van serializados, igual que
 * la geometría del propio territorio.
 *
 * La vuelta importa todavía más: si `parseSecciones` dejara de entender lo
 * guardado, una división guardada desaparecería del mapa de todos sin decir
 * nada.
 */

const trozo: TerritorySection = {
  id: 's1',
  nombre: 'Con Ana',
  color: '#2563EB',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-0.79, 38.47],
        [-0.78, 38.47],
        [-0.78, 38.48],
        [-0.79, 38.47],
      ],
    ],
  },
};

/** ¿Hay algún array dentro de otro array? Es lo que Firestore no traga. */
const arrayAnidado = (valor: unknown, yaEnArray = false): boolean => {
  if (Array.isArray(valor)) {
    if (yaEnArray) return true;
    return valor.some((v) => arrayAnidado(v, true));
  }
  if (valor && typeof valor === 'object')
    return Object.values(valor).some((v) => arrayAnidado(v, false));
  return false;
};

describe('secciones de territorio ↔ Firestore', () => {
  it('el trozo tal cual lleva arrays anidados (esto es lo que fallaba)', () => {
    expect(arrayAnidado([trozo])).toBe(true);
  });

  it('ya serializado, no', () => {
    expect(arrayAnidado(serializeSecciones([trozo]))).toBe(false);
  });

  it('va y vuelve igual', () => {
    expect(parseSecciones(serializeSecciones([trozo]))).toEqual([trozo]);
  });

  it('un territorio sin dividir no trae trozos', () => {
    expect(parseSecciones(undefined)).toBeUndefined();
    expect(parseSecciones([])).toEqual([]);
  });

  it('descarta el trozo cuyo polígono no se entiende, y conserva los demás', () => {
    // Antes que enseñar medio reparto inventado, se enseña el que se entiende.
    const guardado = [
      ...serializeSecciones([trozo]),
      { id: 's2', nombre: 'B', color: '#DC2626', geometry: 'esto no es JSON' },
    ];

    expect(parseSecciones(guardado)).toEqual([trozo]);
  });
});
