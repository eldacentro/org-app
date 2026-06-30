// Entidad "Visita del Superintendente de Circuito".
//
// Supera a la antigua lista ligera `settings.cong_settings.circuit_overseer.visits[]`
// (que solo guardaba `weekOf`). Aquí la visita es una entidad rica con su propio
// programa (comidas, predicación, reuniones especiales). El nombre del CO sigue
// viviendo en settings (es identidad, no parte de una visita concreta).

export type CircuitVisitMeal = {
  id: string;
  date: string; // yyyy/MM/dd
  type: 'lunch' | 'dinner';
  host: string; // familia/publicador anfitrión (texto libre)
  note: string;
};

export type CircuitVisitPreaching = {
  id: string;
  date: string; // yyyy/MM/dd
  time: string; // HH:mm
  meetingPoint: string; // punto de salida
  group: string; // grupo asignado
  note: string;
};

export type CircuitVisitSpecialMeeting = {
  date: string; // yyyy/MM/dd
  time: string; // HH:mm
  place: string;
} | null;

export type CircuitVisitType = {
  id: string;
  _deleted: boolean;
  updatedAt: string;

  // Rango de la visita (martes a domingo) y el lunes normalizado de esa semana,
  // que es la clave para casar con schedules/sources (mismo criterio que el resto
  // de la app: getWeekDate).
  date_start: string; // yyyy/MM/dd (martes)
  date_end: string; // yyyy/MM/dd (domingo)
  weekOf: string; // yyyy/MM/dd (lunes)

  meals: CircuitVisitMeal[];
  preaching: CircuitVisitPreaching[];

  meeting_pioneers: CircuitVisitSpecialMeeting;
  meeting_elders: CircuitVisitSpecialMeeting;

  // Contabilidad: org-app no tiene módulo de finanzas; esto es solo una nota de
  // "gestionado aparte" para la checklist de la visita.
  accounting_note: string;
};
