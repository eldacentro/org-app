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

/** Identifica el cargo del superintendente de servicio por aproximación de texto */
const isServiceOverseerCargo = (cargo: string) => {
  const norm = normalize(cargo);
  return norm.includes('servicio') || norm.includes('service') || norm.includes('serviço') || norm.includes('servico');
};

/**
 * Retorna todos los person_uid de los responsables de territorios:
 * - El superintendente de servicio (buscado en cargosAncianos).
 * - Los responsables, auxiliares y miembros del departamento "Territorios".
 */
export const getTerritoryManagersUids = (
  responsabilidades: ResponsabilidadesType,
  persons: PersonType[]
): string[] => {
  const uids = new Set<string>();

  // 1. Añadir al superintendente de servicio (buscando en cargosAncianos)
  responsabilidades?.cargosAncianos?.forEach((c) => {
    if (isServiceOverseerCargo(c.cargo) && c.responsable) {
      uids.add(c.responsable);
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
