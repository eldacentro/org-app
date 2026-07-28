import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { circuitVisitsState } from '@states/circuit_visit';
import { CircuitVisitType } from '@definition/circuit_visit';
import { formatDate } from '@utils/date';

/**
 * La visita vigente: la que está ocurriendo, o la siguiente que haya.
 *
 * "Vigente" es `date_end >= hoy`, así que aparece en cuanto alguien la
 * programa y desaparece sola el día después de terminar. No hay que acordarse
 * de quitarla, que es justo donde estas cosas se quedan colgadas.
 *
 * Vive aquí y no dentro del control de acceso porque lo usan dos sitios que no
 * tienen nada que ver: ese control y la pestaña del programa semanal.
 */
const useUpcomingCircuitVisit = (): CircuitVisitType | null => {
  const visits = useAtomValue(circuitVisitsState);

  return useMemo(() => {
    const todayStr = formatDate(new Date(), 'yyyy/MM/dd');

    const upcoming = visits
      .filter((visit) => !visit._deleted && visit.date_end >= todayStr)
      .toSorted((a, b) => a.date_start.localeCompare(b.date_start));

    return upcoming[0] ?? null;
  }, [visits]);
};

export default useUpcomingCircuitVisit;
