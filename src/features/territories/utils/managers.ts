import { PersonType } from '@definition/person';
import { ResponsabilidadesType, Departamento } from '@definition/responsabilidades';
import { personIsElder } from '@services/app/persons';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isTerritoryDept = (dep: Departamento) =>
  normalize(dep.name).includes('territorio');

const deptMemberUids = (dep: Departamento): string[] => {
  const uids = [dep.responsable, dep.auxiliar].filter(Boolean) as string[];
  if (dep.type === 'extended') uids.push(...dep.members);
  return uids;
};

/**
 * Retorna todos los person_uid de los responsables de territorios:
 * - Todos los ancianos activos.
 * - Los responsables, auxiliares y miembros del departamento "Territorios".
 */
export const getTerritoryManagersUids = (
  responsabilidades: ResponsabilidadesType,
  persons: PersonType[]
): string[] => {
  const uids = new Set<string>();

  // 1. Añadir a todos los ancianos activos
  persons.forEach((p) => {
    if (p._deleted.value) return;
    if (personIsElder(p)) {
      uids.add(p.person_uid);
    }
  });

  // 2. Añadir miembros del departamento de territorios
  responsabilidades?.departamentos
    ?.filter(isTerritoryDept)
    .forEach((dep) => {
      deptMemberUids(dep).forEach((uid) => uids.add(uid));
    });

  return Array.from(uids);
};
