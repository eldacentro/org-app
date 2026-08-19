import { describe, expect, it } from 'vitest';
import { pruneSeenApplications } from './applications_seen';

describe('pruneSeenApplications', () => {
  it('conserva las que siguen pendientes', () => {
    expect(pruneSeenApplications(['a', 'b'], ['a', 'b', 'c'])).toEqual([
      'a',
      'b',
    ]);
  });

  it('olvida las que ya no están pendientes', () => {
    expect(pruneSeenApplications(['a', 'b'], ['b'])).toEqual(['b']);
  });

  it('una solicitud nueva no hereda el visto de la anterior', () => {
    // Se borró la solicitud 'a' y el hermano volvió a firmar: identificador
    // nuevo, así que no está en el registro y tiene que volver a avisar.
    const seen = pruneSeenApplications(['a'], ['a-nueva']);

    expect(seen).toEqual([]);
    expect(seen.includes('a-nueva')).toBe(false);
  });

  it('devuelve el mismo array si no hay nada que quitar', () => {
    const seen = ['a', 'b'];

    expect(pruneSeenApplications(seen, ['a', 'b'])).toBe(seen);
  });

  // La regresión que hacía reaparecer el aviso en cada arranque: al abrir la
  // aplicación las solicitudes aún no han bajado, la lista de pendientes está
  // vacía por eso, y limpiar contra ella borraba el registro entero.
  it('sin pendientes NO se toca el registro (aún no han bajado)', () => {
    const seen = ['a', 'b'];

    expect(pruneSeenApplications(seen, [])).toBe(seen);
  });
});
