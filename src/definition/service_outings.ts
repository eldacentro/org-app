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
};

export type ServiceOutingSettingsType = {
  weekOf: 'settings';
  updatedAt?: string;
  lastModifiedBy?: string;
  defaultHours: {
    tuesday_morning: string;
    tuesday_afternoon: string;
    wednesday_morning: string;
    wednesday_afternoon: string;
    thursday_morning: string;
    thursday_afternoon: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  locations: string[];
  availability: {
    [person_uid: string]: string[]; // array de slots en los que está disponible (ej: ["tue_morning", "sat"])
  };
};
