export type ServiceOutingType = {
  id: string;        // Ej: "2026-05-26_tue_1000"
  date: string;      // "2026/05/26"
  time: string;      // "10:00"
  person: string;    // person_uid or ""
  location: string;  // Ej: "Salón del Reino" o personalizada
  cancelled: boolean;
};

export type ServiceOutingWeekType = {
  weekOf: string;    // "YYYY/MM/DD" (Monday of the week)
  updatedAt?: string;
  lastModifiedBy?: string;
  outings?: ServiceOutingType[];
  isCircuitOverseerWeek?: boolean;
  weekOverrideHours?: Record<string, string>;
};

export type ServiceOutingSettingsType = {
  weekOf: 'settings';
  updatedAt?: string;
  lastModifiedBy?: string;
  defaultHours: Record<string, string>;
  // Excepciones de horario por mes (ej: julio con salidas de tarde más tarde
  // por el calor). Clave "YYYY/MM". Mismo patrón que monthlyOverrides en
  // Exhibitors — reemplaza defaultHours por completo para ese mes, o marca
  // el mes entero como suspendido.
  //
  // Un mes suspendido puede llevar EXCEPCIONES en `keepActiveSlots`: una lista
  // de turnos (ej. ["saturday_morning"]) o días completos (ej. ["saturday"])
  // que siguen activos pese a la suspensión — permite "suspender agosto pero
  // mantener la salida del sábado". Sin la lista (o vacía) = suspensión total,
  // igual que antes.
  monthlyOverrides?: Record<
    string,
    Record<string, string> | { isCancelledMonth: boolean; keepActiveSlots?: string[] }
  >;
  locations: string[];
  availability: {
    [person_uid: string]: string[]; // array de slots en los que está disponible (ej: ["tue_morning", "sat"])
  };
  disabledSlots?: string[];
  sharedSlots?: {
    id: string;
    slotKey: string;
    congregation: string;
  }[];
};
