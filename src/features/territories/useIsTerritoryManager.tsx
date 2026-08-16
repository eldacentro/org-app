import { useAtomValue } from 'jotai';
import { responsabilidadesState } from '@states/responsabilidades';
import { congRoleState, userLocalUIDState } from '@states/settings';
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
 * ¿A este usuario le suenan las solicitudes de territorio?
 *
 * Los del departamento "Territorios" de Responsabilidades —responsable,
 * auxiliar y miembros— y el SUPERINTENDENTE DE SERVICIO.
 *
 * Sigue siendo mucho más estrecho que `useIsTerritoryManager`, y a propósito:
 * una cosa es PODER entrar a repartir territorios (los ancianos, siempre) y
 * otra que te suene el teléfono cada vez que alguien pide uno. Por eso NO
 * entran el administrador ni el resto del comité de servicio por serlo — eso
 * es lo que hacía que una solicitud le sonara a gente que no lleva
 * territorios, y que a quien de verdad los lleva le llegara mezclada con los
 * avisos de todos los demás.
 *
 * El superintendente de servicio sí, porque la predicación es suya: es quien
 * responde de que los territorios se repartan aunque el departamento esté de
 * viaje o sin cubrir.
 */
export const useCanReceiveTerritoryRequestNotifications = (): boolean => {
  // El rol a pelo, y NO `isServiceCommittee` de `useCurrentUser`: ese devuelve
  // true también para el administrador (y por tanto para el secretario y el
  // coordinador, que ya cuentan como administrador), que es justo a quien se
  // quitó de aquí.
  const congRole = useAtomValue(congRoleState);
  const responsabilidades = useAtomValue(responsabilidadesState);
  const uid = useAtomValue(userLocalUIDState);

  if (congRole.includes('service_overseer')) return true;

  if (!uid || !responsabilidades) return false;

  return responsabilidades.departamentos
    .filter(isTerritoryDept)
    .some((dep) => deptMemberUids(dep).includes(uid));
};
