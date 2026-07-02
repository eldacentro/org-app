// Entidad "Visita del Superintendente de Circuito".
//
// Supera a la antigua lista ligera `settings.cong_settings.circuit_overseer.visits[]`
// (que solo guardaba `weekOf`). Aquí la visita es una entidad rica con su propio
// programa (comidas, predicación, reuniones especiales). El nombre del CO sigue
// viviendo en settings (es identidad, no parte de una visita concreta).
//
// La predicación NO tiene lista propia: la fuente es "Salidas de predicación"
// (service_outings) de esa misma semana — ver useCircuitVisitDashboard.tsx y
// services/app/circuit_visit_projection.ts. Aquí solo guardamos lo que no
// existe en service_outings: con quién (y si con su esposa) sale el
// superintendente tras cada salida ya asignada.

export type CircuitVisitMeal = {
  id: string;
  date: string; // yyyy/MM/dd
  host: string; // person_uid del anfitrión, elegido con PersonPicker
  note: string;
};

export type CircuitVisitCompanionActivity = 'predicacion' | 'revisitas' | 'curso';

export type CircuitVisitCompanion = {
  // Clave estable de la salida en service_outings: `${date}_${time}`. NO se usa
  // el id de la salida porque ese id se regenera para slots aún sin asignar.
  outingKey: string;
  brother: string; // person_uid del hermano que acompaña al CO
  withWife: boolean; // ¿viene la esposa del CO?
  activity: CircuitVisitCompanionActivity;
  // Hermanas asignadas para ir con la esposa del CO en esa misma salida
  // (grupo paralelo). Vacío si el CO es soltero o la esposa no viene.
  spouse_companions: string[]; // person_uids
};

export type CircuitVisitSpecialMeeting = {
  date: string; // yyyy/MM/dd
  time: string; // HH:mm
  place: string;
} | null;

export type CircuitVisitShepherdingVisit = {
  id: string;
  brother: string; // person_uid del hermano visitado
  elder: string;   // person_uid del anciano que acompaña al CO
  date: string;    // yyyy/MM/dd
  time: string;    // HH:mm
  note: string;
};

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

  // Superintendente sustituto: si viene uno distinto al habitual.
  // Vacío/false = viene el CO titular (nombre desde settings).
  is_substitute: boolean;
  substitute_name: string;
  substitute_spouse_name: string;

  meals: CircuitVisitMeal[];
  co_companions: CircuitVisitCompanion[];
  shepherding_visits: CircuitVisitShepherdingVisit[];

  meeting_pioneers: CircuitVisitSpecialMeeting;
  meeting_elders: CircuitVisitSpecialMeeting;

  // Contabilidad: org-app no tiene módulo de finanzas; esto es solo una nota de
  // "gestionado aparte" para la checklist de la visita.
  accounting_note: string;
};
