/**
 * Las series de vídeos de jw.org.
 *
 * Existe por un caso muy concreto: en la visita del superintendente, el discurso
 * público puede sustituirse por un episodio de una serie. Escribir a mano el
 * título, la duración y la portada de cada episodio sería trabajo repetido y
 * además se quedaría viejo; jw.org los sirve, y permite pedirlos desde el
 * navegador, igual que las duraciones de las canciones.
 *
 * LA DESCRIPCIÓN VIENE POR OTRO LADO. Esta interfaz de medios la devuelve
 * SIEMPRE VACÍA —comprobado en español, inglés y francés, y por las dos rutas
 * (un vídeo suelto y la serie entera)—; quien la tiene es la página web del
 * episodio. Y esa no se puede pedir desde el navegador: jw.org no manda la
 * cabecera que autorizaría a otro sitio a leerla. Así que la pide nuestro
 * servidor, que entre servidores esa restricción no existe. Ver
 * `apiJwVideoDescriptionGet` y, en el backend, `services/jw_video`.
 *
 * Para las dos cosas hace falta `lank`: el identificador que abre el episodio en
 * jw.org sin depender del idioma ni de cómo tengan ordenada la biblioteca.
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
  /**
   * `pub-gnj_2_VIDEO`, sin idioma. Es lo que entiende `jw.org/open?lank=…`, que
   * lleva a la página del episodio en el idioma que se le pida.
   */
  lank: string;
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
      languageAgnosticNaturalKey?: string;
      title?: string;
      durationFormattedMinSec?: string;
      images?: Record<string, Record<string, string>>;
    };

    // Sin clave o sin título no hay episodio que enseñar. Mejor dejarlo fuera
    // que pintar una tarjeta vacía que nadie sabe qué es.
    if (!registro?.naturalKey || !registro?.title) continue;

    episodios.push({
      key: registro.naturalKey,
      lank: registro.languageAgnosticNaturalKey ?? '',
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

/** La página del episodio en jw.org, en el idioma de la congregación. */
export const episodeUrl = (lank: string, langCode: string) =>
  `https://www.jw.org/open?lank=${encodeURIComponent(lank)}&wtlocale=${encodeURIComponent(langCode)}`;

/**
 * El identificador sin idioma, a partir del que sí lo lleva.
 *
 * `pub-gnj_S_2_VIDEO` → `pub-gnj_2_VIDEO`.
 *
 * Hace falta porque en el programa se guarda el que LLEVA idioma (`media_key`)
 * y para preguntarle nada a jw.org hace falta el que NO lo lleva. Normalmente se
 * saca de la lista de episodios, que trae los dos; esto es para cuando esa lista
 * no está —jw.org no contestó ese día, o es la primera vez en ese teléfono—, que
 * si no el botón de traer la descripción no llegaba ni a salir.
 *
 * Se quita el trozo que ES el código de idioma, no «el segundo trozo»: el
 * símbolo de la publicación lleva guiones y cifras dentro
 * (`pub-jwb-136_S_6_VIDEO`) y contar posiciones se rompería con el primero que
 * traiga un guion bajo. Sin encontrarlo se devuelve cadena vacía: preferimos no
 * enseñar el botón antes que enseñarlo y que pregunte por algo inventado.
 */
export const lankDesdeMediaKey = (mediaKey: string, langCode: string) => {
  if (!mediaKey || !langCode) return '';

  const trozos = mediaKey.split('_');

  // Desde el 1: el trozo 0 es el símbolo de la publicación y nunca es el idioma.
  const donde = trozos.findIndex(
    (trozo, indice) =>
      indice > 0 && trozo.toUpperCase() === langCode.toUpperCase()
  );

  if (donde === -1) return '';

  return [...trozos.slice(0, donde), ...trozos.slice(donde + 1)].join('_');
};
