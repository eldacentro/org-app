import { describe, expect, it } from 'vitest';
import { importWouldWipeTable } from './import_guard';

/**
 * El freno de mano de la importación.
 *
 * Esto no es una comprobación cosmética: sin ella, un archivo que no trae una
 * tabla la borra entera, y el borrado se propaga por sincronización a todos los
 * dispositivos de la congregación. Ha pasado dos veces (13 y 27 de julio).
 */

const registros = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('cuándo hay que frenar la importación de una tabla', () => {
  it('FRENA: el archivo no trae la tabla y en el dispositivo hay datos', () => {
    // El caso de las 96 personas.
    expect(importWouldWipeTable([], registros(96))).toBe(true);
  });

  it('FRENA también si la tabla viene como undefined', () => {
    expect(importWouldWipeTable(undefined, registros(96))).toBe(true);
  });

  it('NO frena si el archivo trae registros: eso es una importación normal', () => {
    expect(importWouldWipeTable(registros(96), registros(96))).toBe(false);
  });

  it('NO frena si el archivo trae MENOS registros: ahí sí se quiere borrar', () => {
    // Quitar a alguien de verdad es legítimo: viene una lista real, más corta.
    expect(importWouldWipeTable(registros(95), registros(96))).toBe(false);
  });

  it('NO frena en un dispositivo vacío: no hay nada que perder', () => {
    expect(importWouldWipeTable([], [])).toBe(false);
    expect(importWouldWipeTable([], undefined)).toBe(false);
  });

  it('NO frena en la primera importación de una congregación nueva', () => {
    expect(importWouldWipeTable(registros(50), [])).toBe(false);
  });
});
