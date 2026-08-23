/**
 * Las series de vídeos de jw.org.
 *
 * Existe por un caso muy concreto: en la visita del superintendente, el discurso
 * público puede sustituirse por un episodio de una serie. Escribir a mano el
 * título, la duración y la portada de cada episodio sería trabajo repetido y
 * además se quedaría viejo; jw.org los sirve, y permite pedirlos desde el
 * navegador, igual que las duraciones de las canciones.
 *
 * LO QUE NO SIRVE jw.org: la descripción del episodio («Mire cómo Juan el
 * Bautista prepara el camino…»). Esa solo está en la página web, así que se
 * escribe a mano y es opcional.
 */

export type JwSeries = {
  /** La clave de la categoría en jw.org. */
  key: string;
  name: string;
};

/**
 * Las series que se pueden elegir.
 *
 * Una lista corta y a mano, no todas las de jw.org: aquí solo tienen sentido las
 * que se ponen en una reunión. Añadir otra es una línea.
 */
export const SERIES_DISPONIBLES: JwSeries[] = [
  { key: 'SeriesGoodNews', name: 'Las buenas noticias según Jesús' },
];

export type JwEpisode = {
  /** `pub-gnj_S_2_VIDEO`. Identifica el episodio y el idioma. */
  key: string;
  title: string;
  /** «52m 46s», tal como lo da jw.org. */
  duration: string;
  /** La portada. Vacío si jw.org no la trae. */
  image: string;
};

export const seriesUrl = (langCode: string, seriesKey: string) =>
  `https://b.jw-cdn.org/apis/mediator/v1/categories/${langCode}/${seriesKey}?detailed=1&mediaLimit=0`;

/**
 * La portada, eligiendo el recorte que mejor va en una tarjeta.
 *
 * jw.org sirve cuatro familias —panorámica, apaisada, cuadrada— y de cada una
 * varios tamaños. Se prefiere la apaisada grande porque es la que se parece a
 * cómo lo enseña la propia jw.org, y se cae hacia lo que haya.
 */
export const mejorPortada = (
  images: Record<string, Record<string, string>> | undefined
): string => {
  if (!images) return '';

  const orden: [string, string][] = [
    ['wss', 'lg'],
    ['lsr', 'xl'],
    ['pnr', 'lg'],
    ['sqr', 'md'],
  ];

  for (const [familia, tamano] of orden) {
    const url = images[familia]?.[tamano];

    if (typeof url === 'string' && url.length > 0) return url;
  }

  // Cualquiera antes que ninguna.
  for (const familia of Object.values(images)) {
    for (const url of Object.values(familia ?? {})) {
      if (typeof url === 'string' && url.length > 0) return url;
    }
  }

  return '';
};

export const parseSeriesEpisodes = (payload: unknown): JwEpisode[] => {
  const media = (payload as { category?: { media?: unknown[] } })?.category
    ?.media;

  if (!Array.isArray(media)) return [];

  const episodios: JwEpisode[] = [];

  for (const item of media) {
    const registro = item as {
      naturalKey?: string;
      title?: string;
      durationFormattedMinSec?: string;
      images?: Record<string, Record<string, string>>;
    };

    // Sin clave o sin título no hay episodio que enseñar. Mejor dejarlo fuera
    // que pintar una tarjeta vacía que nadie sabe qué es.
    if (!registro?.naturalKey || !registro?.title) continue;

    episodios.push({
      key: registro.naturalKey,
      title: registro.title,
      duration: registro.durationFormattedMinSec ?? '',
      image: mejorPortada(registro.images),
    });
  }

  return episodios;
};

/* ─────────────────────────── dónde se guardan ──────────────────────────── */

const CLAVE = 'jwSeries';

/** Un mes: las series no cambian a menudo, pero cuando sale un episodio nuevo. */
export const SERIES_STALE_MS = 30 * 24 * 60 * 60 * 1000;

export type SeriesCache = {
  langCode: string;
  seriesKey: string;
  episodes: JwEpisode[];
  fetchedAt: string;
};

export const readSeries = (
  langCode: string,
  seriesKey: string
): SeriesCache | null => {
  try {
    const raw = localStorage.getItem(`${CLAVE}:${seriesKey}:${langCode}`);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as SeriesCache;

    if (!Array.isArray(parsed?.episodes)) return null;

    return parsed;
  } catch {
    return null;
  }
};

export const seriesStale = (
  cache: SeriesCache | null,
  now = Date.now()
): boolean => {
  if (!cache || cache.episodes.length === 0) return true;

  const fecha = Date.parse(cache.fetchedAt);

  if (!Number.isFinite(fecha)) return true;

  return now - fecha > SERIES_STALE_MS;
};

export const fetchSeriesEpisodes = async (
  langCode: string,
  seriesKey: string
): Promise<SeriesCache | null> => {
  try {
    const respuesta = await fetch(seriesUrl(langCode, seriesKey));

    if (!respuesta.ok) return null;

    const episodes = parseSeriesEpisodes(await respuesta.json());

    if (episodes.length === 0) return null;

    const cache: SeriesCache = {
      langCode,
      seriesKey,
      episodes,
      fetchedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        `${CLAVE}:${seriesKey}:${langCode}`,
        JSON.stringify(cache)
      );
    } catch {
      /* sin almacenamiento: se volverá a pedir */
    }

    return cache;
  } catch {
    return null;
  }
};
