import { Navigate } from 'react-router';
import useCircuitVisitAccess from '@features/circuit_visit/useCircuitVisitAccess';
import CircuitVisitDashboard from '@features/circuit_visit';
import CircuitVisitSummary from '@features/circuit_visit/CircuitVisitSummary';

// Coordinador/Admin: panel completo editable, en cualquier momento.
// Ancianos: resumen completo de solo lectura, en cualquier momento.
// Resto de publicadores: resumen limitado de solo lectura, solo desde 21
// días antes de que empiece la visita (y mientras dura). Fuera de esos
// casos, se redirige al inicio.
const CircuitVisitPage = () => {
  const { tier, visit } = useCircuitVisitAccess();

  if (tier === 'full') return <CircuitVisitDashboard />;

  if ((tier === 'elder' || tier === 'public') && visit) {
    return <CircuitVisitSummary visit={visit} tier={tier} />;
  }

  return <Navigate to="/" replace />;
};

export default CircuitVisitPage;
