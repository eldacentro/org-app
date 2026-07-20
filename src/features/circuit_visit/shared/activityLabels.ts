import { CircuitVisitCompanionActivity } from '@definition/circuit_visit';

// Etiquetas de la actividad que hace el acompañante con el superintendente.
// Compartidas por el panel del coordinador y el resumen de solo lectura.
export const ACTIVITY_LABELS: Record<CircuitVisitCompanionActivity, string> = {
  predicacion: 'Predicación',
  revisitas: 'Revisitas',
  curso: 'Curso bíblico',
};
