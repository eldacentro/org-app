import { Navigate } from 'react-router';
import useIsCircuitVisitManager from '@features/circuit_visit/useIsCircuitVisitManager';
import CircuitVisitDashboard from '@features/circuit_visit';

// Sección estrictamente restringida al Coordinador (COBA) y Administradores.
// Si alguien llega por URL sin permiso, se le redirige al inicio.
const CircuitVisitPage = () => {
  const canManage = useIsCircuitVisitManager();

  if (!canManage) return <Navigate to="/" replace />;

  return <CircuitVisitDashboard />;
};

export default CircuitVisitPage;
