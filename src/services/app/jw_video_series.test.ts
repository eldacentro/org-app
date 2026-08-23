import { describe, expect, it } from 'vitest';
import {
  mejorPortada,
  parseSeriesEpisodes,
  seriesStale,
  seriesUrl,
  episodeUrl,
  SERIES_STALE_MS,
  lankDesdeMediaKey,
} from './jw_video_series';

/**
 * Los episodios de una serie de jw.org.
 *
 * La respuesta es de jw.org y no la controlamos. Lo que se comprueba es que un
 * cambio de formato al otro lado se traduzca en «no hay episodios» —y el
 * discurso público se queda como estaba— y nunca en una tarjeta a medias con un
 * título vacío.
 */

/** Recortado de la respuesta real (español, agosto de 2026). */
const RESPUESTA = {
  category: {
    key: 'SeriesGoodNews',
    name: 'Las buenas noticias según Jesús',
    media: [
      {
        naturalKey: 'pub-gnj_S_1_VIDEO',
        languageAgnosticNaturalKey: 'pub-gnj_1_VIDEO',
        title: 'Episodio 1: La verdadera luz del mundo',
        durationFormattedMinSec: '1h 11m 1s',
        images: {
          wss: { lg: 'https://cms-imgp.jw-cdn.org/1_wss_lg.jpg' },
          sqr: { md: 'https://cms-imgp.jw-cdn.org/1_sqr_md.jpg' },
        },
      },
      {
        naturalKey: 'pub-gnj_S_2_VIDEO',
        languageAgnosticNaturalKey: 'pub-gnj_2_VIDEO',
        title: 'Episodio 2: “Este es mi Hijo”',
        durationFormattedMinSec: '52m 46s',
        images: { sqr: { md: 'https://cms-imgp.jw-cdn.org/2_sqr_md.jpg' } },
      },
    ],
  },
};

describe('leer la serie', () => {
  it('saca los episodios con su título, duración y portada', () => {
    const episodios = parseSeriesEpisodes(RESPUESTA);

    expect(episodios).toHaveLength(2);
    expect(episodios[1]).toEqual({
      key: 'pub-gnj_S_2_VIDEO',
      lank: 'pub-gnj_2_VIDEO',
      title: 'Episodio 2: “Este es mi Hijo”',
      duration: '52m 46s',
      image: 'https://cms-imgp.jw-cdn.org/2_sqr_md.jpg',
    });
  });

  it('un episodio sin clave o sin título se queda fuera', () => {
    // Mejor uno menos que una tarjeta vacía que nadie sabe qué es.
    const episodios = parseSeriesEpisodes({
      category: {
        media: [
          { title: 'Sin clave', durationFormattedMinSec: '1m' },
          { naturalKey: 'pub-x_S_1_VIDEO' },
          { naturalKey: 'pub-x_S_2_VIDEO', title: 'Bueno' },
        ],
      },
    });

    expect(episodios.map((e) => e.title)).toEqual(['Bueno']);
  });

  it('sin portada el episodio sigue valiendo', () => {
    const [episodio] = parseSeriesEpisodes({
      category: { media: [{ naturalKey: 'k', title: 'T' }] },
    });

    expect(episodio.image).toBe('');
    expect(episodio.duration).toBe('');
  });

  it('otra forma de respuesta no revienta: simplemente no hay episodios', () => {
    expect(parseSeriesEpisodes(undefined)).toEqual([]);
    expect(parseSeriesEpisodes({})).toEqual([]);
    expect(parseSeriesEpisodes({ category: { media: 'nada' } })).toEqual([]);
  });
});

describe('qué portada se elige', () => {
  it('la apaisada grande, que es como lo enseña jw.org', () => {
    expect(
      mejorPortada({
        sqr: { md: 'cuadrada' },
        wss: { lg: 'apaisada' },
      })
    ).toBe('apaisada');
  });

  it('si no está la preferida, se cae hacia la que haya', () => {
    expect(mejorPortada({ sqr: { md: 'cuadrada' } })).toBe('cuadrada');
    expect(mejorPortada({ rara: { xx: 'la que sea' } })).toBe('la que sea');
  });

  it('sin imágenes, cadena vacía y no revienta', () => {
    expect(mejorPortada(undefined)).toBe('');
    expect(mejorPortada({})).toBe('');
  });
});

describe('cuándo se vuelve a pedir', () => {
  const ahora = new Date(2026, 7, 23, 12, 0, 0).getTime();

  const cache = (fetchedAt: string) => ({
    langCode: 'S',
    seriesKey: 'SeriesGoodNews',
    episodes: [{ key: 'k', lank: 'l', title: 'T', duration: '', image: '' }],
    fetchedAt,
  });

  it('sin nada guardado, se pide', () => {
    expect(seriesStale(null, ahora)).toBe(true);
  });

  it('recién pedida, no', () => {
    expect(seriesStale(cache(new Date(ahora).toISOString()), ahora)).toBe(
      false
    );
  });

  it('pasado el mes, sí — que puede haber salido un episodio nuevo', () => {
    expect(
      seriesStale(
        cache(new Date(ahora - SERIES_STALE_MS - 1000).toISOString()),
        ahora
      )
    ).toBe(true);
  });

  it('una lista vacía guardada no cuenta como guardada', () => {
    expect(
      seriesStale(
        { ...cache(new Date(ahora).toISOString()), episodes: [] },
        ahora
      )
    ).toBe(true);
  });
});

describe('el enlace al episodio en jw.org', () => {
  it('usa la clave SIN idioma y pide el idioma aparte', () => {
    // `lank` es el identificador que no depende del idioma; el idioma va en
    // `wtlocale`. Así el enlace lleva a la página en el idioma de la
    // congregación sin tener que saber cómo se llama allí.
    expect(episodeUrl('pub-gnj_2_VIDEO', 'S')).toBe(
      'https://www.jw.org/open?lank=pub-gnj_2_VIDEO&wtlocale=S'
    );
  });

  it('sin clave sigue siendo una dirección válida, no un enlace roto a medias', () => {
    expect(episodeUrl('', 'S')).toContain('lank=&wtlocale=S');
  });
});

describe('a dónde se piden', () => {
  it('la dirección lleva el idioma y la serie', () => {
    expect(seriesUrl('S', 'SeriesGoodNews')).toContain(
      '/v1/categories/S/SeriesGoodNews'
    );
  });
});

describe('lankDesdeMediaKey', () => {
  it('quita el idioma', () => {
    expect(lankDesdeMediaKey('pub-gnj_S_2_VIDEO', 'S')).toBe('pub-gnj_2_VIDEO');
    expect(lankDesdeMediaKey('pub-gnj_E_2_VIDEO', 'E')).toBe('pub-gnj_2_VIDEO');
  });

  it('aguanta un símbolo con guiones y cifras', () => {
    // Contando posiciones esto se rompería con el primer símbolo que traiga un
    // guion bajo; por eso se busca el trozo que ES el idioma.
    expect(lankDesdeMediaKey('pub-jwb-136_S_6_VIDEO', 'S')).toBe(
      'pub-jwb-136_6_VIDEO'
    );
    expect(lankDesdeMediaKey('pub-jwbvod26_S_3_VIDEO', 'S')).toBe(
      'pub-jwbvod26_3_VIDEO'
    );
  });

  it('con códigos de idioma de varias letras', () => {
    expect(lankDesdeMediaKey('pub-gnj_CHS_2_VIDEO', 'CHS')).toBe(
      'pub-gnj_2_VIDEO'
    );
  });

  it('no se lleva por delante el símbolo aunque se llame como el idioma', () => {
    expect(lankDesdeMediaKey('S_S_2_VIDEO', 'S')).toBe('S_2_VIDEO');
  });

  it('sin encontrar el idioma no se inventa nada', () => {
    expect(lankDesdeMediaKey('pub-gnj_E_2_VIDEO', 'S')).toBe('');
    expect(lankDesdeMediaKey('cualquier-cosa', 'S')).toBe('');
    expect(lankDesdeMediaKey('', 'S')).toBe('');
    expect(lankDesdeMediaKey('pub-gnj_S_2_VIDEO', '')).toBe('');
  });
});
