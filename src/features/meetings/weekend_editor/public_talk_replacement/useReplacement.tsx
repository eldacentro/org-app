import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { JWLangState } from '@states/settings';
import { apiJwVideoDescriptionGet } from '@services/api/app';
import {
  fetchSeriesEpisodes,
  readSeries,
  seriesStale,
  SERIES_DISPONIBLES,
  type JwEpisode,
} from '@services/app/jw_video_series';

/** En qué anda la descripción. */
export type EstadoDescripcion = 'quieto' | 'trayendo' | 'fallo';

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
  const [estadoDescripcion, setEstadoDescripcion] =
    useState<EstadoDescripcion>('quieto');

  /**
   * El último episodio por el que se ha preguntado.
   *
   * Se elige uno, y antes de que conteste jw.org se elige otro: si no se mira
   * esto, la respuesta del primero llega después y pisa la descripción del
   * segundo. Se ve poco y se entiende menos cuando pasa.
   */
  const ultimoPedido = useRef('');

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

  /**
   * Trae la descripción del episodio y la entrega a quien la pidió.
   *
   * Pasa por nuestro servidor: jw.org publica la descripción en la página del
   * vídeo, pero no manda la cabecera que dejaría a la aplicación pedírsela desde
   * el navegador. Ver `apiJwVideoDescriptionGet`.
   *
   * Devolver cadena vacía NO es un fallo —hay vídeos sin descripción—, y por eso
   * el estado se queda en «quieto»: no hay nada que reintentar. El estado de
   * fallo es para cuando no se ha podido ni preguntar.
   */
  const pedirDescripcion = useCallback(
    async (lank: string, aplicar: (texto: string) => void) => {
      if (!lank) return;

      ultimoPedido.current = lank;
      setEstadoDescripcion('trayendo');

      try {
        const texto = await apiJwVideoDescriptionGet(lank);

        if (ultimoPedido.current !== lank) return;

        setEstadoDescripcion('quieto');

        if (texto) aplicar(texto);
      } catch {
        if (ultimoPedido.current !== lank) return;

        setEstadoDescripcion('fallo');
      }
    },
    []
  );

  return {
    serie,
    episodios,
    cargando,
    lang,
    estadoDescripcion,
    pedirDescripcion,
  };
};

export default useReplacement;
