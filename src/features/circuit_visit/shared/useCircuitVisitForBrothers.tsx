import { useMemo } from 'react';
import { addDays } from '@utils/date';
import useUpcomingCircuitVisit from './useUpcomingCircuitVisit';
import { CircuitVisitType } from '@definition/circuit_visit';

/** Dos meses. Con cuánta antelación se enseña la visita a los hermanos. */
export const CIRCUIT_VISIT_PREVIEW_DAYS = 60;

/**
 * LA VISITA, PARA LOS HERMANOS.
 *
 * La pestaña «Visita del superintendente» de Programas semanales la ve todo el
 * mundo, pero no desde siempre: desde dos meses antes de que empiece.
 *
 * `useUpcomingCircuitVisit` devuelve la visita en cuanto alguien la programa,
 * y eso es lo que necesita el cuerpo de ancianos —que la prepara con mucha
 * antelación desde su propia página—. Pero para el resto, una pestaña que
 * aparece un año antes no informa de nada: solo ocupa sitio en la fila de
 * pestañas durante meses.
 *
 * La página de la visita es otra cosa y no pasa por aquí: esa es de los
 * ancianos, y siempre.
 */
const useCircuitVisitForBrothers = (): CircuitVisitType | null => {
  const visit = useUpcomingCircuitVisit();

  return useMemo(() => {
    if (!visit) return null;

    const desde = addDays(new Date(visit.date_start), -CIRCUIT_VISIT_PREVIEW_DAYS);

    return new Date() >= desde ? visit : null;
  }, [visit]);
};

export default useCircuitVisitForBrothers;
