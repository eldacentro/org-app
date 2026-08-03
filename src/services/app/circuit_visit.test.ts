import { describe, expect, it } from 'vitest';
import { CircuitVisitType } from '@definition/circuit_visit';
import { circuitVisitChangedSincePublish } from './circuit_visit';

/**
 * La decisión de la tira de aviso de la visita del superintendente.
 *
 * Se prueba porque es una afirmación sobre lo que la congregación ya vio: si
 * falla por un lado, se avisa de un cambio que no ha habido; si falla por el
 * otro, se calla uno que sí. Y porque el filo —publicar es en sí mismo un
 * guardado— no se ve leyendo el código.
 */

const buildVisit = (
  changes: Partial<CircuitVisitType> = {}
): Pick<CircuitVisitType, 'published' | 'publishedAt' | 'updatedAt'> => ({
  published: true,
  publishedAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...changes,
});

describe('circuitVisitChangedSincePublish', () => {
  it('avisa cuando la visita se ha tocado después de publicarla', () => {
    expect(
      circuitVisitChangedSincePublish(
        buildVisit({ updatedAt: '2026-08-02T09:30:00.000Z' })
      )
    ).toBe(true);
  });

  it('no avisa justo después de publicar (las dos marcas son la misma)', () => {
    // Publicar ES un guardado: `dbCircuitVisitSave` sella `updatedAt` y
    // `publishedAt` con el mismo valor. Con `>=` la tira saldría al instante.
    expect(circuitVisitChangedSincePublish(buildVisit())).toBe(false);
  });

  it('no avisa si la visita se publicó antes de que existiera el sello', () => {
    // El histórico: `published` sin `publishedAt`. No se sabe desde cuándo, así
    // que no se afirma nada.
    expect(
      circuitVisitChangedSincePublish(
        buildVisit({ publishedAt: '', updatedAt: '2026-08-02T09:30:00.000Z' })
      )
    ).toBe(false);

    expect(
      circuitVisitChangedSincePublish(
        buildVisit({
          publishedAt: undefined,
          updatedAt: '2026-08-02T09:30:00.000Z',
        })
      )
    ).toBe(false);
  });

  it('no avisa mientras la visita está en borrador', () => {
    // Eso ya lo dice la etiqueta naranja de la cabecera, y lo repartido no le
    // ha llegado a nadie.
    expect(
      circuitVisitChangedSincePublish(
        buildVisit({ published: false, updatedAt: '2026-08-02T09:30:00.000Z' })
      )
    ).toBe(false);
  });

  it('trata como publicada la visita anterior a la publicación (published sin definir)', () => {
    // `undefined` = publicada, igual que en `isCircuitVisitPublished`. Con
    // sello y un cambio posterior, sí hay que avisar.
    expect(
      circuitVisitChangedSincePublish(
        buildVisit({
          published: undefined,
          updatedAt: '2026-08-02T09:30:00.000Z',
        })
      )
    ).toBe(true);
  });

  it('no avisa de una visita que no existe, ni de una sin marcas', () => {
    expect(circuitVisitChangedSincePublish(null)).toBe(false);
    expect(circuitVisitChangedSincePublish(undefined)).toBe(false);
    expect(
      circuitVisitChangedSincePublish({
        published: true,
        publishedAt: '',
        updatedAt: '',
      })
    ).toBe(false);
  });

  it('un sello posterior al último cambio tampoco avisa (volver a publicar cierra la tira)', () => {
    expect(
      circuitVisitChangedSincePublish(
        buildVisit({
          updatedAt: '2026-08-02T09:30:00.000Z',
          publishedAt: '2026-08-02T09:30:00.000Z',
        })
      )
    ).toBe(false);
  });
});
