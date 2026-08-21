/**
 * Cuánto dura cada canción, según jw.org.
 *
 * El cancionero `.jwpub` NO lo trae —comprobado abriendo el archivo: 163 vídeos
 * y ninguna columna de duración—, pero la interfaz de medios de jw.org sí, y en
 * una sola petición devuelve los 163 con la suya. La respuesta permite pedirla
 * desde el navegador (`access-control-allow-origin: *`), así que no hace falta
 * pasar por el servidor de la aplicación.
 *
 * Para qué sirve: es el único punto del programa donde se sabe DE ANTEMANO
 * cuánto va a durar algo. Con eso, el hueco de «canción y oración» se parte en
 * dos pasos y el de la canción se pasa solo al terminar, sin que quien preside
 * tenga que pulsar.
 *
 * Se guarda en el propio navegador y no en la base de datos: es una copia de
 * datos públicos que se puede volver a pedir en cualquier momento, así que no
 * merece una tabla nueva ni viajar en la sincronización.
 */

const CATEGORIA = 'VODSJJMeetings';

export const songDurationsUrl = (langCode: string) =>
  `https://b.jw-cdn.org/apis/mediator/v1/categories/${langCode}/${CATEGORIA}?detailed=1&mediaLimit=0`;

export type SongDurations = {
  /** Código de idioma de JW Library ('S', 'E'…). */
  langCode: string;
  /** Número de canción → segundos. */
  seconds: Record<number, number>;
  /** Cuándo se pidieron, en ISO. */
  fetchedAt: string;
};

/**
 * Cada cuánto se vuelven a pedir solas.
 *
 * Un mes: los canciones no cambian a menudo, pero cuando sale una nueva nadie va
 * a acordarse de venir a pulsar un botón.
 */
export const SONG_DURATIONS_STALE_MS = 30 * 24 * 60 * 60 * 1000;

const CLAVE = 'songDurations';

/**
 * Sacar el número de canción y su duración de la respuesta.
 *
 * `naturalKey` viene como `pub-sjjm_S_77_VIDEO`. Se lee de ahí y no del título
 * («77. Que reine la paz») porque el título está traducido y su formato depende
 * del idioma; la clave no.
 */
export const parseSongDurations = (
  payload: unknown
): Record<number, number> => {
  const media = (payload as { category?: { media?: unknown[] } })?.category
    ?.media;

  if (!Array.isArray(media)) return {};

  const seconds: Record<number, number> = {};

  for (const item of media) {
    const registro = item as { naturalKey?: string; duration?: number };

    const numero = Number(
      registro?.naturalKey?.match(/_(\d+)_VIDEO$/i)?.[1] ?? NaN
    );

    const duracion = Number(registro?.duration);

    if (!Number.isFinite(numero) || numero <= 0) continue;
    if (!Number.isFinite(duracion) || duracion <= 0) continue;

    seconds[numero] = Math.round(duracion);
  }

  return seconds;
};

export const readSongDurations = (langCode: string): SongDurations | null => {
  try {
    const raw = localStorage.getItem(`${CLAVE}:${langCode}`);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as SongDurations;

    if (!parsed?.seconds || typeof parsed.seconds !== 'object') return null;

    return parsed;
  } catch {
    return null;
  }
};

export const writeSongDurations = (value: SongDurations) => {
  try {
    localStorage.setItem(`${CLAVE}:${value.langCode}`, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: se volverá a pedir la próxima vez */
  }
};

/** Si toca volver a pedirlas. */
export const songDurationsStale = (
  guardadas: SongDurations | null,
  now = Date.now()
): boolean => {
  if (!guardadas) return true;

  const fecha = Date.parse(guardadas.fetchedAt);

  if (!Number.isFinite(fecha)) return true;

  return now - fecha > SONG_DURATIONS_STALE_MS;
};

/**
 * Pedirlas a jw.org y guardarlas.
 *
 * Devuelve `null` si no se pudo (sin red, o la respuesta no trae nada). Que no
 * se puedan traer no rompe nada: sin duraciones, el hueco de la canción y la
 * oración se queda entero, como estaba.
 */
export const fetchSongDurations = async (
  langCode: string
): Promise<SongDurations | null> => {
  try {
    const respuesta = await fetch(songDurationsUrl(langCode));

    if (!respuesta.ok) return null;

    const seconds = parseSongDurations(await respuesta.json());

    if (Object.keys(seconds).length === 0) return null;

    const value: SongDurations = {
      langCode,
      seconds,
      fetchedAt: new Date().toISOString(),
    };

    writeSongDurations(value);

    return value;
  } catch {
    return null;
  }
};
