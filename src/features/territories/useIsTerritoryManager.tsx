import { useAtomValue } from 'jotai';
import { responsabilidadesState } from '@states/responsabilidades';
import { userLocalUIDState } from '@states/settings';
import { useCurrentUser } from '@hooks/index';
import { Departamento } from '@definition/responsabilidades';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase();

/** ¿El departamento es el de Territorios? (match por nombre, sin acentos). */
const isTerritoryDept = (dep: Departamento) =>
  normalize(dep.name).includes('territorio');

/** uids implicados en un departamento (responsable, auxiliar y miembros). */
const deptMemberUids = (dep: Departamento): string[] => {
  const uids = [dep.responsable, dep.auxiliar].filter(Boolean) as string[];
  if (dep.type === 'extended') uids.push(...dep.members);
  return uids;
};

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
