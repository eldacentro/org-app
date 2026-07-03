import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { circuitVisitsState } from '@states/circuit_visit';
import { CircuitVisitType } from '@definition/circuit_visit';
import { useCurrentUser } from '@hooks/index';
import { addDays, formatDate } from '@utils/date';
import useIsCircuitVisitManager from './useIsCircuitVisitManager';

export type CircuitVisitAccessTier = 'full' | 'elder' | 'public' | 'none';

const PUBLIC_PREVIEW_DAYS = 21;

/**
 * Nivel de acceso a "Visita del Superintendente de Circuito":
 * - 'full': Coordinador/Admin — panel completo, editable, en cualquier momento.
 * - 'elder': el resto de ancianos — resumen completo de solo lectura, en
 *   cualquier momento (isElder ya engloba admin/coordinador/secretario).
 * - 'public': cualquier publicador — resumen limitado de solo lectura, solo
 *   desde 21 días antes de que empiece la visita (y mientras dura).
 * - 'none': no hay nada que mostrar (sin visita relevante, fuera de ventana).
 */
export const useCircuitVisitAccess = () => {
  const canManage = useIsCircuitVisitManager();
  const { isElder } = useCurrentUser();
  const visits = useAtomValue(circuitVisitsState);

  const relevantVisit = useMemo<CircuitVisitType | null>(() => {
    const todayStr = formatDate(new Date(), 'yyyy/MM/dd');
    const upcoming = visits
      .filter((v) => !v._deleted && v.date_end >= todayStr)
      .toSorted((a, b) => a.date_start.localeCompare(b.date_start));

    return upcoming[0] ?? null;
  }, [visits]);

  const tier = useMemo<CircuitVisitAccessTier>(() => {
    if (canManage) return 'full';
    if (isElder) return 'elder';
    if (!relevantVisit) return 'none';

    const unlockDate = addDays(new Date(relevantVisit.date_start), -PUBLIC_PREVIEW_DAYS);
    return new Date() >= unlockDate ? 'public' : 'none';
  }, [canManage, isElder, relevantVisit]);

  return { tier, visit: relevantVisit };
};

export default useCircuitVisitAccess;
