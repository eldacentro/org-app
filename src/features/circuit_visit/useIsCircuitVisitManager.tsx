import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { settingsState } from '@states/settings';

/**
 * Acceso al módulo "Visita del Superintendente de Circuito".
 *
 * Estrictamente restringido al Coordinador del cuerpo de ancianos (COBA) y a los
 * Administradores del sistema. A diferencia del `isAdmin` general de
 * useCurrentUser (que también incluye al secretario), aquí solo entran
 * `coordinator` y `admin`.
 */
export const useIsCircuitVisitManager = (): boolean => {
  const settings = useAtomValue(settingsState);

  return useMemo(() => {
    const roles = settings.user_settings.cong_role ?? [];
    return roles.includes('coordinator') || roles.includes('admin');
  }, [settings]);
};

export default useIsCircuitVisitManager;
