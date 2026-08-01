import { useCurrentUser } from '@hooks/index';

/**
 * Quién PREPARA la visita del superintendente de circuito.
 *
 * Los ancianos, y desde siempre — no solo cuando se acerca. Antes esto estaba
 * restringido al coordinador y a los administradores, y el resto del cuerpo de
 * ancianos se quedaba en un resumen de solo lectura: tres niveles de acceso
 * para una pantalla que prepara el cuerpo de ancianos entero.
 *
 * `isElder` ya engloba al coordinador, al secretario y a los administradores.
 */
export const useIsCircuitVisitManager = (): boolean => {
  const { isElder } = useCurrentUser();

  return isElder;
};

export default useIsCircuitVisitManager;
