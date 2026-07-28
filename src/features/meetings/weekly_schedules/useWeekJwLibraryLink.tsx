import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { sourcesState } from '@states/sources';
import { JWLangState } from '@states/settings';
import {
  midweekJwLibraryLink,
  watchtowerJwLibraryLink,
} from '@services/app/jw_library_link';

/**
 * El enlace a JW Library de la semana que se está viendo.
 *
 * Uno por reunión y en la cabecera, no uno por parte: en el programa completo
 * habría diez y sería ruido. En "Mis asignaciones" sí va por fila, porque allí
 * cada hermano ve solo lo suyo.
 *
 * `week` ya es el LUNES de la semana en el programa semanal, así que aquí no
 * hay que normalizar nada — a diferencia de las asignaciones, cuyo weekOf es
 * el día real de la reunión.
 */
const useWeekJwLibraryLink = (
  week: string,
  meeting: 'midweek' | 'weekend'
) => {
  const sources = useAtomValue(sourcesState);
  const jwLang = useAtomValue(JWLangState);

  return useMemo(() => {
    if (!week) return null;

    const locale = jwLang || 'S';
    const source = sources.find((record) => record.weekOf === week);

    return meeting === 'midweek'
      ? midweekJwLibraryLink(source, week, locale)
      : watchtowerJwLibraryLink(source, locale);
  }, [week, meeting, sources, jwLang]);
};

export default useWeekJwLibraryLink;
