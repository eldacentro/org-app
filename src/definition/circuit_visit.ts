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

  /**
   * ¿Está PUBLICADA? Mientras no lo esté, lo que se reparte a personas
   * —comidas, acompañantes y pastoreo— no le sale a nadie en "Mis
   * asignaciones": los ancianos pueden ir poniendo nombres a lápiz sin que al
   * hermano le llegue una asignación que aún está por confirmar.
   *
   * OPCIONAL a propósito. `undefined` = publicada, que es como se comportaban
   * las visitas antes de que esto existiera: si no, al desplegar el cambio las
   * visitas ya en marcha desaparecerían de golpe de las asignaciones de todos.
   * Las visitas nuevas nacen con `false` (ver `buildVisitForWeek`).
   *
   * Lo que NO depende de esto: que la semana sea semana de visita. El día al
   * que se mueve la reunión, la pestaña de Programas semanales y la entrada de
   * Próximos eventos siguen saliendo desde que se activa la visita — eso no es
   * una asignación de nadie, y ya tiene su propia ventana de dos meses.
   */
  published?: boolean;

  /**
   * CUÁNDO se publicó por última vez (ISO-8601 UTC), para poder avisar de que
   * la visita se ha tocado DESPUÉS de publicarla: la congregación ya vio la
   * versión anterior. Con `published` a secas —un booleano suelto— no había
   * contra qué comparar.
   *
   * Lo que se puede decir con esto es SI se ha tocado, y nada más: la visita es
   * una entidad plana que se guarda entera, con un solo `updatedAt` para todo
   * el registro (ver services/worker/circuitVisitMerge.ts). No hay marca por
   * comida ni por acompañante, así que aquí NUNCA se puede decir "N cambios"
   * como en las reuniones — sería un número inventado.
   *
   * Vacío ('') = sin sello: o está en borrador, o se publicó antes de que esto
   * existiera. En ese segundo caso no se avisa de nada, que es lo honesto: no
   * se sabe desde cuándo. Vacío y nunca `null`: `decryptObject` ELIMINA las
   * claves que viajan como null.
   */
  publishedAt?: string;
};
