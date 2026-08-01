import { Navigate } from 'react-router';
import useCircuitVisitAccess from '@features/circuit_visit/useCircuitVisitAccess';
import CircuitVisitDashboard from '@features/circuit_visit';
import CircuitVisitSummary from '@features/circuit_visit/CircuitVisitSummary';

// Ancianos: el panel completo, editable, en cualquier momento.
// Publicadores: resumen de solo lectura, desde dos meses antes de que empiece
// la visita y mientras dura. Fuera de eso, al inicio.
const CircuitVisitPage = () => {
  const { tier, visit } = useCircuitVisitAccess();

  if (tier === 'full') return <CircuitVisitDashboard />;

  if (tier === 'public' && visit) {
    return <CircuitVisitSummary visit={visit} />;
  }

  return <Navigate to="/" replace />;
};

export default CircuitVisitPage;
