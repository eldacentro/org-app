import { CircuitVisitType } from '@definition/circuit_visit';

// Si la visita tiene un sustituto activo, el programa debe mostrar su
// nombre en vez del CO titular configurado en Ajustes.
export const getEffectiveCoName = (
  visit: CircuitVisitType,
  coName: string,
  coSpouseName: string
) => {
  const effectiveCoName =
    visit.is_substitute && visit.substitute_name ? visit.substitute_name : coName;
  const effectiveCoSpouseName = visit.is_substitute
    ? visit.substitute_spouse_name || ''
    : coSpouseName;

  return { effectiveCoName, effectiveCoSpouseName };
};
