import { MeetingType } from './app';

export enum Week {
  NORMAL = 1,
  CO_VISIT = 2,
  ASSEMBLY = 3,
  CONVENTION = 4,
  MEMORIAL = 5,
  SPECIAL_TALK = 6,
  TREASURES_PART = 7,
  TREASURES_STUDENTS = 8,
  STUDENTS_ASSIGNMENTS = 9,
  STUDENTS_LIVING = 10,
  LIVING_PART = 11,
  PUBLIC_TALK = 12,
  WATCHTOWER_STUDY = 13,
  SPECIAL_TALK_ONLY = 14,
  NO_MEETING = 20,
}

/**
 * Semanas en las que NO hay reunión en el Salón del Reino.
 *
 * La lista vive aquí, junto al enum, y no en `constants` ni en
 * `services/app/schedules`, por dos razones. Una: estaba escrita en los dos
 * sitios, y una lista de casos duplicada solo espera a que alguien añada un
 * caso en uno y no en el otro. Y dos: quien más la necesita son cálculos puros
 * —la rotación de la limpieza— y `services/app/schedules` arrastra consigo la
 * tienda entera y `localStorage`, lo que lo vuelve imposible de probar en Node.
 *
 * `WEEK_TYPE_NO_MEETING` (en `@constants`) y `schedulesWeekNoMeeting` (en
 * `@services/app/schedules`) siguen existiendo para no tocar sus llamadas, pero
 * los dos salen ya de aquí.
 */
export const WEEK_TYPES_NO_MEETING = [
  Week.ASSEMBLY,
  Week.CONVENTION,
  Week.MEMORIAL,
  Week.NO_MEETING,
];

export const weekTypeHasNoMeeting = (week: Week) =>
  WEEK_TYPES_NO_MEETING.includes(week);

export type WeekType = {
  id: Week;
  sort_index: number;
  language_group: boolean;
  meeting?: MeetingType[];
  week_type_name: {
    [language: string]: string;
  };
};

export type WeekTypeLocale = {
  id: Week;
  sort_index: number;
  language_group: boolean;
  meeting?: MeetingType[];
  week_type_name: string;
};
