import { describe, expect, it } from 'vitest';
import {
  buildFieldChanges,
  latestChange,
  latestUpdatedAt,
} from './last_modified';

/**
 * Lo que hace útil a «Última actualización»: decir QUÉ cambió.
 *
 * Las dos cosas que se pueden romper sin que se note en pantalla son que un
 * campo compuesto se quede con la marca vieja en vez de la nueva, y que un
 * cambio hecho en el grupo de otro idioma se cuele como cambio del tuyo.
 */

const marca = (updatedAt: string, extra: object = {}) => ({
  value: 'x',
  updatedAt,
  ...extra,
});

describe('la marca más reciente de un campo', () => {
  it('de una hoja suelta, la suya', () => {
    expect(latestUpdatedAt(marca('2026-08-03T10:00:00.000Z'))).toBe(
      '2026-08-03T10:00:00.000Z'
    );
  });

  it('de un campo compuesto, la más nueva de dentro', () => {
    // «Presidente» son en realidad dos sitios: sala principal y auxiliar.
    const presidente = {
      main_hall: [marca('2026-08-01T10:00:00.000Z')],
      aux_class_1: marca('2026-08-03T10:00:00.000Z'),
    };

    expect(latestUpdatedAt(presidente)).toBe('2026-08-03T10:00:00.000Z');
  });

  it('de algo que nunca se tocó, nada', () => {
    expect(latestUpdatedAt({ main_hall: [] })).toBe('');
    expect(latestUpdatedAt(null)).toBe('');
    expect(latestUpdatedAt(undefined)).toBe('');
    expect(latestUpdatedAt('2026-08-03')).toBe('');
  });

  it('no baja por debajo de una hoja que ya trae su marca', () => {
    // Una asignación lleva `confirmed` dentro; eso no es otro campo.
    const asignacion = marca('2026-08-03T10:00:00.000Z', { confirmed: true });

    expect(latestUpdatedAt(asignacion)).toBe('2026-08-03T10:00:00.000Z');
  });
});

describe('el filtro por vista de datos', () => {
  const campo = [
    marca('2026-08-01T10:00:00.000Z', { type: 'main' }),
    marca('2026-08-03T10:00:00.000Z', { type: 'grupo-ingles' }),
  ];

  it('un cambio del grupo de otro idioma no cuenta como cambio del tuyo', () => {
    expect(latestUpdatedAt(campo, 'main')).toBe('2026-08-01T10:00:00.000Z');
  });

  it('y visto desde ese grupo, sí', () => {
    expect(latestUpdatedAt(campo, 'grupo-ingles')).toBe(
      '2026-08-03T10:00:00.000Z'
    );
  });

  it('sin vista de datos se mira todo', () => {
    expect(latestUpdatedAt(campo)).toBe('2026-08-03T10:00:00.000Z');
  });
});

describe('la lista que ve un hermano', () => {
  it('lo más reciente arriba, y fuera lo que nunca se tocó', () => {
    const cambios = buildFieldChanges([
      { label: 'Presidente', node: marca('2026-08-03T10:00:00.000Z') },
      { label: 'Lectura de la Biblia', node: { main_hall: [] } },
      { label: 'Oración de apertura', node: marca('2026-08-05T09:00:00.000Z') },
      {
        label: 'Oración de conclusión',
        node: marca('2026-07-20T09:00:00.000Z'),
      },
    ]);

    expect(cambios.map((c) => c.label)).toEqual([
      'Oración de apertura',
      'Presidente',
      'Oración de conclusión',
    ]);
  });

  it('si no se tocó nada, la lista está vacía', () => {
    expect(buildFieldChanges([{ label: 'Presidente', node: {} }])).toEqual([]);
  });
});

describe('quién hizo cada cambio', () => {
  /**
   * El autor vive pegado al campo desde el 2026-08-05. Antes solo existía el
   * del registro entero —el último que guardó cualquier cosa de esa semana—, y
   * con eso el panel decía «cambió todo esto, y el último fue Fulano», que es
   * como no decir nada.
   *
   * Un fallo aquí no pierde datos: señala a un hermano por algo que no hizo,
   * que en una congregación es peor.
   */
  const campo = (updatedAt: string, by?: string, type = 'main') => [
    { type, value: 'uid-1', name: '', updatedAt, ...(by ? { by } : {}) },
  ];

  it('la marca más nueva se lleva SU autor, no el de otra', () => {
    // El filo: coger la fecha de una y el nombre de otra le atribuiría a
    // alguien un cambio que no hizo.
    const nodo = {
      main_hall: campo('2026-08-01T10:00:00Z', 'Ana'),
      aux_class_1: campo('2026-08-05T20:41:00Z', 'Carlos')[0],
    };

    expect(latestChange(nodo)).toEqual({
      updatedAt: '2026-08-05T20:41:00Z',
      by: 'Carlos',
    });
  });

  it('sin autor guardado no se inventa ninguno', () => {
    // Todo lo repartido antes de que esto existiera cae aquí, y el panel lo
    // dice en voz alta en vez de atribuírselo al último que guardó.
    expect(latestChange(campo('2026-07-01T10:00:00Z'))).toEqual({
      updatedAt: '2026-07-01T10:00:00Z',
      by: undefined,
    });
  });

  it('el autor de otra vista de datos tampoco se cuela', () => {
    expect(
      latestChange(campo('2026-08-05T20:41:00Z', 'Carlos', 'grupo'), 'main')
    ).toEqual({ updatedAt: '', by: undefined });
  });

  it('cada línea del panel lleva el suyo', () => {
    const cambios = buildFieldChanges([
      { label: 'Presidente', node: campo('2026-08-01T10:00:00Z', 'Ana') },
      { label: 'Oración', node: campo('2026-08-05T20:41:00Z', 'Carlos') },
    ]);

    expect(cambios).toEqual([
      { label: 'Oración', updatedAt: '2026-08-05T20:41:00Z', by: 'Carlos' },
      { label: 'Presidente', updatedAt: '2026-08-01T10:00:00Z', by: 'Ana' },
    ]);
  });
});
