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
 * ¿A este usuario le suenan las solicitudes de territorio?
 *
 * Solo a los del departamento "Territorios" de Responsabilidades — responsable,
 * auxiliar y miembros. NADIE más: ni el administrador, ni el comité de
 * servicio por serlo. Antes entraban los dos por delante, así que una
 * solicitud le sonaba a gente que no lleva territorios y a quien de verdad los
 * lleva le llegaba mezclada con los avisos de todos los demás.
 *
 * Mucho más estrecho que `useIsTerritoryManager`, y a propósito: una cosa es
 * PODER entrar a repartir territorios (los ancianos, siempre) y otra que te
 * avise el teléfono cada vez que alguien pide uno.
 */
export const useCanReceiveTerritoryRequestNotifications = (): boolean => {
  const responsabilidades = useAtomValue(responsabilidadesState);
  const uid = useAtomValue(userLocalUIDState);

  if (!uid || !responsabilidades) return false;

  return responsabilidades.departamentos
    .filter(isTerritoryDept)
    .some((dep) => deptMemberUids(dep).includes(uid));
};
