import { useAtomValue } from 'jotai';
import { responsabilidadesState } from '@states/responsabilidades';
import { userLocalUIDState } from '@states/settings';
import { useCurrentUser } from '@hooks/index';
import { isTerritoryDept, deptMemberUids } from './utils/managers';

/**
 * Acceso al panel de gestión de Territorios: ancianos/admin SIEMPRE, además de
 * los responsables/auxiliares/miembros del departamento "Territorios" definido
 * en Responsabilidades (aunque no sean ancianos).
 */
export const useIsTerritoryManager = (): boolean => {
  const { isElder, isAdmin } = useCurrentUser();
  const responsabilidades = useAtomValue(responsabilidadesState);
  const uid = useAtomValue(userLocalUIDState);

  if (isElder || isAdmin) return true;
  if (!uid || !responsabilidades) return false;

  return responsabilidades.departamentos
    .filter(isTerritoryDept)
    .some((dep) => deptMemberUids(dep).includes(uid));
};

/**
 * Determina si el usuario actual debe RECIBIR notificaciones de solicitudes
 * de territorio. Más restrictivo que useIsTerritoryManager:
 *   - Superintendente de servicio (role: service_overseer)
 *   - Admin (coordinador / secretario)
 *   - Miembros del departamento "Territorios" en Responsabilidades
 * Los demás ancianos NO reciben esta notificación.
 */
export const useCanReceiveTerritoryRequestNotifications = (): boolean => {
  const { isAdmin, isServiceCommittee } = useCurrentUser();
  const responsabilidades = useAtomValue(responsabilidadesState);
  const uid = useAtomValue(userLocalUIDState);

  // Comité de servicio (coordinador, secretario, superv. de servicio) siempre recibe
  if (isAdmin || isServiceCommittee) return true;
  if (!uid || !responsabilidades) return false;

  // También reciben los miembros del dpto. "Territorios" en Responsabilidades
  return responsabilidades.departamentos
    .filter(isTerritoryDept)
    .some((dep) => deptMemberUids(dep).includes(uid));
};
