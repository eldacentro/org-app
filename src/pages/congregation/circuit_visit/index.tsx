import { Navigate } from 'react-router';
import useIsCircuitVisitManager from '@features/circuit_visit/useIsCircuitVisitManager';
import CircuitVisitDashboard from '@features/circuit_visit';

// Esta página es la HERRAMIENTA de quien organiza la visita: comidas,
// acompañantes, visitas de pastoreo, documentación. Solo ancianos, y en
// cualquier momento del año — la visita se prepara con mucha antelación.
//
// Lo que el resto de hermanos necesita saber está en la pestaña «Visita del
// superintendente» de Programas semanales, que les sale sola dos meses antes.
const CircuitVisitPage = () => {
  const canManage = useIsCircuitVisitManager();

  if (!canManage) return <Navigate to="/" replace />;

  return <CircuitVisitDashboard />;
};

export default CircuitVisitPage;
