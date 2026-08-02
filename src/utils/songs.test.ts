import { describe, expect, it } from 'vitest';
import { SongOverrideType, SongType } from '@definition/songs';
import { applySongsOverride } from './songs';

/**
 * La convivencia entre el cancionero importado y la reconstrucción.
 *
 * `songs` es una tabla DERIVADA: se rehace entera desde las traducciones al
 * terminar cada sincronización. Lo que estas pruebas fijan es que esa
 * reconstrucción vuelve a dejar en pie lo importado — porque lo importado no
 * vive en `songs`, sino aparte, y se aplica ENCIMA cada vez.
 *
 * Cada llamada a `applySongsOverride` de aquí abajo representa una
 * reconstrucción entera: la lista que se le pasa es la que acaba de salir del
 * paquete de la aplicación, sin rastro de ninguna importación.
 */

const delPaquete = (): SongType[] => [
  { song_number: 1, song_title: { S: 'Las cualidades de Jehová' } },
  { song_number: 2, song_title: { S: 'Título viejo del paquete' } },
  { song_number: 3, song_title: { S: 'Nuestro guía' } },
];

const importado = (
  overrides: Record<string, Record<string, string>>
): SongOverrideType => ({
  id: '1',
  updatedAt: '2026-08-02T10:00:00.000Z',
  overrides,
  publicationTitle: 'Cantemos con gozo a Jehová',
  symbol: 'sjj',
  total: 3,
});

describe('applySongsOverride', () => {
  it('lo importado sobrevive a la reconstrucción', () => {
    const override = importado({ S: { '2': 'Título importado' } });

    // Ciclo de sincronización 1
    const primera = delPaquete();
    applySongsOverride(primera, override);
    expect(primera.find((s) => s.song_number === 2)?.song_title.S).toBe(
      'Título importado'
    );

    // Ciclo de sincronización 2: la lista vuelve a salir limpia del paquete
    const segunda = delPaquete();
    applySongsOverride(segunda, override);
    expect(segunda.find((s) => s.song_number === 2)?.song_title.S).toBe(
      'Título importado'
    );
  });

  it('lo que la importación no menciona se queda como está', () => {
    const songs = delPaquete();

    applySongsOverride(songs, importado({ S: { '2': 'Título importado' } }));

    expect(songs.find((s) => s.song_number === 1)?.song_title.S).toBe(
      'Las cualidades de Jehová'
    );
    expect(songs.find((s) => s.song_number === 3)?.song_title.S).toBe(
      'Nuestro guía'
    );
    expect(songs).toHaveLength(3);
  });

  it('sin importación, el cancionero es el del paquete y nada más', () => {
    const songs = delPaquete();

    applySongsOverride(songs, undefined);

    expect(songs).toEqual(delPaquete());
  });

  it('una importación VACÍA no borra ningún cántico', () => {
    const songs = delPaquete();

    applySongsOverride(songs, importado({}));

    expect(songs).toEqual(delPaquete());
  });

  it('un idioma sin nada dentro tampoco borra nada', () => {
    const songs = delPaquete();

    applySongsOverride(songs, importado({ S: {} }));

    expect(songs).toEqual(delPaquete());
  });

  it('un cántico que el paquete no trae se añade', () => {
    const songs = delPaquete();

    applySongsOverride(songs, importado({ S: { '160': 'Cántico nuevo' } }));

    expect(songs).toHaveLength(4);
    expect(songs.find((s) => s.song_number === 160)?.song_title.S).toBe(
      'Cántico nuevo'
    );
  });

  it('importar en un idioma no toca los títulos de los demás', () => {
    const songs: SongType[] = [
      { song_number: 1, song_title: { S: 'En español', E: 'In English' } },
    ];

    applySongsOverride(songs, importado({ S: { '1': 'Importado' } }));

    expect(songs[0].song_title).toEqual({ S: 'Importado', E: 'In English' });
  });
});
