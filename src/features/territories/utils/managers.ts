import {
  ResponsabilidadesType,
  Departamento,
} from '@definition/responsabilidades';

/**
 * Normaliza texto para comparaciones (quita acentos, minusculas). Antes
 * existian 2 copias verbatim de esto (y de isTerritoryDept/deptMemberUids)
 * en este archivo y en useIsTerritoryManager.tsx - un cambio en como se
 * detecta "quien es encargado de Territorios" corria el riesgo de
 * actualizarse en un sitio y olvidarse en el otro. Ahora es la unica copia.
 */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Es el departamento de Territorios? (match por nombre, sin acentos). */
export const isTerritoryDept = (dep: Departamento) =>
  normalize(dep.name).includes('territorio');

/** uids implicados en un departamento (responsable, auxiliar y miembros). */
export const deptMemberUids = (dep: Departamento): string[] => {
  const uids = [dep.responsable, dep.auxiliar].filter(Boolean) as string[];
  if (dep.type === 'extended' && Array.isArray(dep.members))
    uids.push(...dep.members);
  return uids;
};

/**
 * A quién se AVISA de lo que pasa en Territorios: solicitudes, entregas y
 * direcciones nuevas pendientes de aprobar.
 *
 * Solo los del departamento "Territorios" de Responsabilidades — responsable,
 * auxiliar y miembros. Nadie más: ni el administrador, ni el superintendente
 * de servicio por serlo. Si alguno de ellos tiene que enterarse, se le mete en
 * el departamento, que es donde se dice quién lleva esto.
 *
 * Ojo: si el departamento está vacío no hay a quién avisar, y quien manda una
 * solicitud recibe un "Solicitud registrada" que se lo dice (ver
 * `DialogSolicitar`) en vez de quedarse esperando un aviso que no sale.
 *
 * Esto NO decide quién puede ENTRAR a gestionar Territorios — eso es
 * `useIsTerritoryManager`, y ahí los ancianos sí entran siempre.
 */
export const getTerritoryManagersUids = (
  responsabilidades: ResponsabilidadesType
): string[] => {
  const uids = new Set<string>();

  responsabilidades?.departamentos?.filter(isTerritoryDept).forEach((dep) => {
    deptMemberUids(dep).forEach((uid) => uids.add(uid));
  });

  return Array.from(uids);
};
