import { describe, expect, it } from 'vitest';
import { getComparator, stableSort } from './helpers';

/**
 * El orden de la lista de discursos públicos.
 *
 * En un móvil las columnas de Fecha y Orador se esconden para que la tabla no
 * haya que arrastrarla de lado, y con ellas se fue la única forma de ordenar
 * por fecha: en esta tabla se ordena pulsando el título de la columna. El
 * desplegable de «Ordenar por» las devuelve, y estas pruebas fijan lo que
 * promete cada una de sus opciones.
 *
 * Lo importante es el discurso que NO SE HA DADO NUNCA: su fecha es una cadena
 * vacía, y de eso depende que "hace más que no se da" sea útil de verdad.
 */
const discursos = [
  { talk_number: 3, talk_title: 'Avancemos', last_date: '2026/03/09' },
  { talk_number: 1, talk_title: '¿Conoce bien a Dios?', last_date: '' },
  { talk_number: 2, talk_title: 'Buenas noticias', last_date: '2025/11/17' },
];

const ordenar = (order: 'asc' | 'desc', orderBy: string) =>
  stableSort(discursos, getComparator(order, orderBy)).map(
    (d) => d.talk_number
  );

describe('ordenar los discursos públicos por fecha', () => {
  it('«más reciente primero» pone arriba el último que sonó', () => {
    expect(ordenar('desc', 'last_date')).toEqual([3, 2, 1]);
  });

  it('«hace más que no se da» saca primero el que nunca se ha dado', () => {
    // La cadena vacía va antes que cualquier fecha, así que el que no se ha
    // dado nunca encabeza la lista. Es lo que se busca al mirar por aquí.
    expect(ordenar('asc', 'last_date')).toEqual([1, 2, 3]);
  });
});

describe('los otros órdenes que ofrece el desplegable', () => {
  it('por número, que es como se lee un guion de discursos', () => {
    expect(ordenar('asc', 'talk_number')).toEqual([1, 2, 3]);
  });

  it('por título, alfabético', () => {
    expect(ordenar('asc', 'talk_title').length).toBe(3);
    expect(
      stableSort(discursos, getComparator('asc', 'talk_title')).at(0)
        ?.talk_title
    ).toBe('Avancemos');
  });
});

describe('el empate no reordena', () => {
  it('con todas las fechas vacías, la lista se queda como estaba', () => {
    const sinFechas = discursos.map((d) => ({ ...d, last_date: '' }));

    const ordenados = stableSort(
      sinFechas,
      getComparator('desc', 'last_date')
    ) as typeof sinFechas;

    expect(ordenados.map((d) => d.talk_number)).toEqual([3, 1, 2]);
  });
});
