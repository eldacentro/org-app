import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { JWLangState } from '@states/settings';
import {
  fetchSeriesEpisodes,
  readSeries,
  seriesStale,
  SERIES_DISPONIBLES,
  type JwEpisode,
} from '@services/app/jw_video_series';

/**
 * Los episodios de la serie, para poder elegir uno.
 *
 * Se piden a jw.org y se guardan un mes. Que se refresquen solas importa: la
 * serie sigue publicándose, y cuando salga el episodio siguiente nadie va a
 * acordarse de venir a pulsar un botón.
 */
const useReplacement = () => {
  const lang = useAtomValue(JWLangState);

  const serie = SERIES_DISPONIBLES[0];

  const [episodios, setEpisodios] = useState<JwEpisode[]>(
    () => readSeries(lang, serie.key)?.episodes ?? []
  );
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const guardada = readSeries(lang, serie.key);

    setEpisodios(guardada?.episodes ?? []);

    if (!seriesStale(guardada)) return;

    setCargando(true);

    fetchSeriesEpisodes(lang, serie.key)
      .then((nueva) => {
        if (nueva) setEpisodios(nueva.episodes);
      })
      .finally(() => setCargando(false));
  }, [lang, serie.key]);

  return { serie, episodios, cargando };
};

export default useReplacement;
