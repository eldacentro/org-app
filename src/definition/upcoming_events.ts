export enum UpcomingEventCategory {
  CircuitOverseerWeek,
  PioneerWeek,
  MemorialWeek,
  ConventionWeek,
  AssemblyWeek,
  InternationalConventionWeek,
  SpecialCampaignWeek,
  TheocraticTrainingWeek,
  HallMaintenanceTrainingWeek,
  BethelTour,
  SpecialProgram,
  PublicWitnessing,
  KingdomDedication,
  LanguageCourse,
  AnnualMeeting,
  Custom,
}

export enum UpcomingEventDuration {
  SingleDay,
  MultipleDays,
}

export type UpcomingEventType = {
  event_uid: string;
  _deleted?: boolean;
  updatedAt?: string;
  event_data: {
    _deleted: boolean;
    updatedAt: string;
    start: string;
    end: string;
    type: string;
    category: UpcomingEventCategory;
    duration: UpcomingEventDuration;
    description: string;
    custom?: string;
    topic?: string;
    // Solo aplica cuando category === AssemblyWeek — quién asiste a la
    // asamblea. Se muestra como un selector aparte que solo aparece para
    // ese tipo de evento, y su texto se añade al título, no reemplaza el
    // tipo de evento en sí.
    assemblyRepresentative?: 'branch' | 'co';
    // Horario propio por día en un evento de varios días (p. ej. una
    // asamblea regional de 3 días, donde cada jornada empieza/termina a
    // horas distintas). `date` en formato yyyy/MM/dd. Si un día no tiene
    // entrada aquí, se usa start/end de arriba como su horario.
    dailyTimes?: { date: string; start: string; end: string }[];
    // Solo aplica a las 3 categorías de asamblea (AssemblyWeek/
    // ConventionWeek/InternationalConventionWeek) — enlace pegado a mano
    // por el elder/a cargo al programa de la asamblea en JW Library (no
    // hay forma de calcularlo, a diferencia del esbozo semanal del mwb).
    jwLibraryUrl?: string;
    // Idem — URL de descarga en Firebase Storage de la imagen de portada
    // de la asamblea. El archivo en sí vive en Storage, aquí solo se
    // guarda la URL (mismo patrón que Documentos/Territorios).
    coverPhotoUrl?: string;
    // Dirección/enlace de Google Maps del evento — aplica a cualquier
    // categoría, no solo asambleas (p. ej. la dirección de un Salón de
    // Asambleas o del lugar de la Conmemoración).
    address?: string;
    mapsUrl?: string;
    // Solo aplica cuando category === MemorialWeek — la fecha de la
    // Conmemoración suele saberse con meses de anticipación, pero la hora
    // exacta a veces se define después. Si esto es true, `start`/`end`
    // siguen guardando una hora (00:00 por defecto) para no romper el
    // ordenamiento por fecha, pero la hora no se muestra en la tarjeta
    // hasta que se desmarque y se guarde una hora real.
    timeUnset?: boolean;
  };
};

export type UpcomingEventDataType = {
  uid: string;
  year: number;
  time: string;
  dates: { date: string; dateFormatted: string; day: string; time: string }[];
  custom: string;
  description: string;
  category: UpcomingEventCategory;
  duration: UpcomingEventDuration;
  start: string;
  date: string;
  day: string;
  datesRange?: string;
};
