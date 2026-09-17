import { PublishedMonthsAt } from '@services/app/month_publish';

export type ServiceOutingType = {
  id: string;        // Ej: "2026-05-26_tue_1000"
  date: string;      // "2026/05/26"
  time: string;      // "10:00"
  person: string;    // person_uid or ""
  location: string;  // Ej: "Salón del Reino" o personalizada
  cancelled: boolean;
};

/**
 * Un turno que existe SOLO una semana: la de la visita del superintendente de
 * circuito (un miércoles por la tarde que normalmente no hay), una campaña, un
 * festivo. No toca la configuración de la congregación: vive en el registro de
 * esa semana y se va con ella.
 *
 * Se guarda con su FECHA y no con el día de la semana, para que sea imposible
 * leerlo en otra semana por accidente. La asignación —quién lo conduce— no va
 * aquí: va en `outings`, emparejada por fecha y hora igual que la de cualquier
 * otro turno, así que Mis asignaciones, los avisos y la actividad de la
 * persona la ven sin saber que el turno es añadido.
 */
export type ServiceOutingExtraSlotType = {
  id: string;        // estable: para pintarlo y para poder quitarlo
  date: string;      // "2026/09/16"
  time: string;      // "17:00"
};

export type ServiceOutingWeekType = {
  weekOf: string;    // "YYYY/MM/DD" (Monday of the week)
  updatedAt?: string;
  lastModifiedBy?: string;
  outings?: ServiceOutingType[];
  isCircuitOverseerWeek?: boolean;
  weekOverrideHours?: Record<string, string>;
  /** Turnos añadidos solo para esta semana. Ver `ServiceOutingExtraSlotType`. */
  extraSlots?: ServiceOutingExtraSlotType[];
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
  /**
   * Meses ya publicados ('YYYY/MM'). Un mes que no esté aquí está en BORRADOR:
   * lo que autocompletar propone no le llega a nadie hasta que el responsable
   * lo publica. Ver `services/app/service_outings_publish`.
   */
  publishedMonths?: string[];
  /**
   * CUÁNDO se publicó cada mes ('YYYY/MM' → fecha ISO). Es la referencia contra
   * la que se cuenta si se ha tocado algo desde entonces: `publishedMonths`
   * dice si el mes se ve, pero no desde cuándo, y sin eso no se puede avisar de
   * «lo has cambiado después de publicarlo». Un mes publicado antes de que esto
   * existiera no tiene sello y entonces no se avisa de nada. Ver
   * `services/app/month_publish`.
   */
  publishedMonthsAt?: PublishedMonthsAt;
  disabledSlots?: string[];
  sharedSlots?: {
    id: string;
    slotKey: string;
    congregation: string;
  }[];
};
