export type ExhibitorSettingsType = {
  weekOf: 'settings';
  updatedAt?: string;
  lastModifiedBy?: string;
  turns: {
    id: string; // ID único auto-generado (UUID)
    days: string[]; // ['tuesday', 'saturday'] etc.
    startTime: string; // "10:00"
    endTime: string; // "12:00"
    locations: string[]; // Opciones específicas de ubicación
    defaultLocation: string;
  }[];
  locations: string[]; // Listado global de ubicaciones de exhibidores
  responsibles: string[]; // Array de person_uids habilitados como responsables de turno
  fixedAssignments: {
    turnId: string;
    day?: string;
    personUid: string;
    isResponsible: boolean;
  }[];
  availability: {
    [person_uid: string]: string[]; // Array de turnIds preferidos por cada hermano
  };
};

export type ExhibitorWeekAssignmentType = {
  person: string; // person_uid
  isResponsible: boolean;
};

export type ExhibitorWeekTurnType = {
  turnId: string;
  date: string; // "YYYY/MM/DD"
  assignments: ExhibitorWeekAssignmentType[];
  location: string;
  cancelled: boolean;
};

export type ExhibitorWeekType = {
  weekOf: string; // "YYYY/MM/DD" (Lunes de la semana correspondiente)
  updatedAt?: string;
  lastModifiedBy?: string;
  turns: ExhibitorWeekTurnType[];
};
