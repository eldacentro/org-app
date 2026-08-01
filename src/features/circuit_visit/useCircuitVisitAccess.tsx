import { useMemo } from 'react';
import { addDays } from '@utils/date';
import useIsCircuitVisitManager from './useIsCircuitVisitManager';
import useUpcomingCircuitVisit from './shared/useUpcomingCircuitVisit';

export type CircuitVisitAccessTier = 'full' | 'public' | 'none';

/** Dos meses. Lo que ve un publicador antes de que empiece la visita. */
const PUBLIC_PREVIEW_DAYS = 60;

/**
 * Nivel de acceso a «Visita del Superintendente de Circuito». Dos reglas:
 *
 * - `full`: los ancianos. Preparan la visita, y desde siempre.
 * - `public`: cualquier publicador, desde dos meses antes de que empiece la
 *   visita y mientras dura. Resumen de solo lectura, y sin lo que no le toca
 *   —la reunión con ancianos y siervos ministeriales, el programa de comidas—.
 * - `none`: no hay visita que enseñar, o aún falta más de dos meses.
 *
 * Había un tercer nivel intermedio —anciano en solo lectura— y un caso aparte
 * para quien tuviera algo asignado en la visita, que se adelantaba a la
 * ventana. Con los ancianos editando siempre, el primero sobra; y con dos
 * meses en vez de tres semanas, el segundo también: dos meses son aviso de
 * sobra para una comida o para acompañar en la predicación.
 */
export const useCircuitVisitAccess = () => {
  const canManage = useIsCircuitVisitManager();

  const relevantVisit = useUpcomingCircuitVisit();

  const tier = useMemo<CircuitVisitAccessTier>(() => {
    if (canManage) return 'full';
    if (!relevantVisit) return 'none';

    const unlockDate = addDays(
      new Date(relevantVisit.date_start),
      -PUBLIC_PREVIEW_DAYS
    );

    return new Date() >= unlockDate ? 'public' : 'none';
  }, [canManage, relevantVisit]);

  return { tier, visit: relevantVisit };
};

export default useCircuitVisitAccess;
