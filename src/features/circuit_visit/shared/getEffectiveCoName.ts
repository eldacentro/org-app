import { CircuitVisitType } from '@definition/circuit_visit';

// Si la visita tiene un sustituto activo, el programa debe mostrar su
// nombre en vez del CO titular configurado en Ajustes.
/**
 * Frase de contexto para la tarjeta de Próximos eventos. Con esposa intenta
 * la forma natural "Nos visitan Unai y Carol Korkóstegui" (nombre de él +
 * nombre de ella + apellido de él) cuando ella está guardada solo por nombre;
 * si ella ya trae apellido propio, "Nos visitan X y Z" tal cual.
 */
export const buildVisitGreeting = (coName: string, coSpouseName: string) => {
  if (!coName) return '';
  if (!coSpouseName) return `Nos visita ${coName}.`;

  const nameParts = coName.trim().split(/\s+/);
  const spouseParts = coSpouseName.trim().split(/\s+/);

  if (nameParts.length >= 2 && spouseParts.length === 1) {
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    return `Nos visitan ${firstName} y ${coSpouseName} ${lastName}.`;
  }

  return `Nos visitan ${coName} y ${coSpouseName}.`;
};

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
