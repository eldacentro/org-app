import { describe, expect, it } from 'vitest';
import {
  buildJwpubOverrideEntries,
  computeJwpubReport,
} from './jwpub_report';

/**
 * El informe de una importación desde `.jwpub`.
 *
 * Se prueba aquí porque las dos cosas que puede hacer mal terminan en el
 * mismo sitio: que alguien crea que ha importado algo que no ha importado, o
 * —peor— que un archivo incompleto se lleve por delante lo que ya había. La
 * segunda tiene un incidente real detrás (2026-07-13, media tabla de
 * programas borrada por una casilla vacía en un archivo de importación), y de
 * ahí sale la regla que estas pruebas fijan: **una lista incompleta en un
 * archivo NUNCA borra nada**.
 */

const canciones = (pares: [number, string][]) =>
  pares.map(([number, title]) => ({ number, title }));

describe('computeJwpubReport', () => {
  it('reimportar el MISMO archivo no cambia nada, y lo dice', () => {
    const actual = canciones([
      [1, 'Las cualidades de Jehová'],
      [2, 'Jehová es tu nombre'],
      [3, 'Nuestro guía'],
    ]);

    const informe = computeJwpubReport(actual, actual);

    expect(informe.hasChanges).toBe(false);
    expect(informe.unchanged).toBe(3);
    expect(informe.total).toBe(3);
    expect(informe.changes).toHaveLength(0);
    expect(informe.missing).toHaveLength(0);
  });

  it('cuenta las nuevas por separado de las cambiadas', () => {
    const actual = canciones([
      [1, 'Las cualidades de Jehová'],
      [2, 'Título viejo'],
    ]);

    const archivo = canciones([
      [1, 'Las cualidades de Jehová'],
      [2, 'Título nuevo'],
      [3, 'Nuestro guía'],
    ]);

    const informe = computeJwpubReport(archivo, actual);

    expect(informe.unchanged).toBe(1);
    expect(informe.changes).toHaveLength(2);

    const nuevas = informe.changes.filter((c) => c.kind === 'added');
    const cambiadas = informe.changes.filter((c) => c.kind === 'renamed');

    expect(nuevas.map((c) => c.number)).toEqual([3]);
    expect(cambiadas).toHaveLength(1);
    expect(cambiadas[0]).toMatchObject({
      number: 2,
      previous_title: 'Título viejo',
      new_title: 'Título nuevo',
    });
  });

  it('un archivo VACÍO no borra nada: lo cuenta como "ya no está"', () => {
    const actual = canciones([
      [1, 'Las cualidades de Jehová'],
      [2, 'Jehová es tu nombre'],
    ]);

    const informe = computeJwpubReport([], actual);

    expect(informe.total).toBe(0);
    expect(informe.hasChanges).toBe(false);
    expect(informe.changes).toHaveLength(0);
    expect(informe.missing.map((m) => m.number)).toEqual([1, 2]);

    // Lo que se escribiría: nada.
    expect(buildJwpubOverrideEntries(informe)).toEqual({});
  });

  it('un archivo a medias solo escribe lo que trae; el resto se queda', () => {
    const actual = canciones([
      [1, 'Las cualidades de Jehová'],
      [2, 'Jehová es tu nombre'],
      [3, 'Nuestro guía'],
    ]);

    const archivo = canciones([[2, 'Jehová es tu nombre (revisada)']]);

    const informe = computeJwpubReport(archivo, actual);

    expect(informe.changes.map((c) => c.number)).toEqual([2]);
    expect(informe.missing.map((m) => m.number)).toEqual([1, 3]);

    expect(buildJwpubOverrideEntries(informe)).toEqual({
      '2': 'Jehová es tu nombre (revisada)',
    });
  });

  it('un número que la aplicación tiene en blanco no es un "ya no está"', () => {
    const actual = canciones([
      [1, 'Las cualidades de Jehová'],
      [2, ''],
    ]);

    const informe = computeJwpubReport(
      canciones([[1, 'Las cualidades de Jehová']]),
      actual
    );

    expect(informe.missing).toHaveLength(0);
  });

  it('un número en blanco que el archivo SÍ trae cuenta como nuevo', () => {
    const informe = computeJwpubReport(
      canciones([[7, 'Un título']]),
      canciones([[7, '']])
    );

    expect(informe.changes).toHaveLength(1);
    expect(informe.changes[0].kind).toBe('added');
  });

  it('distingue pasar a "No usar" de volver a estar en uso', () => {
    const actual = canciones([
      [10, 'Un discurso vigente'],
      [11, '(No usar)'],
    ]);

    const archivo = canciones([
      [10, '(No usar)'],
      [11, 'Otra vez en uso'],
    ]);

    const informe = computeJwpubReport(archivo, actual);

    expect(informe.changes.find((c) => c.number === 10)?.kind).toBe('retired');
    expect(informe.changes.find((c) => c.number === 11)?.kind).toBe(
      'reactivated'
    );
  });

  it('devuelve los cambios y lo que falta ordenado por número', () => {
    const actual = canciones([
      [30, 'Treinta'],
      [4, 'Cuatro'],
      [12, 'Doce'],
    ]);

    const archivo = canciones([
      [30, 'Treinta cambiado'],
      [4, 'Cuatro cambiado'],
    ]);

    const informe = computeJwpubReport(archivo, actual);

    expect(informe.changes.map((c) => c.number)).toEqual([4, 30]);
    expect(informe.missing.map((m) => m.number)).toEqual([12]);
  });

  it('lo que se guarda son los cambios, no el archivo entero', () => {
    const actual = canciones([
      [1, 'Igual'],
      [2, 'Viejo'],
    ]);

    const archivo = canciones([
      [1, 'Igual'],
      [2, 'Nuevo'],
    ]);

    const informe = computeJwpubReport(archivo, actual);

    // El 1 no aparece: guardarlo idéntico despertaría a los observadores de
    // la tabla para nada.
    expect(buildJwpubOverrideEntries(informe)).toEqual({ '2': 'Nuevo' });
  });
});
