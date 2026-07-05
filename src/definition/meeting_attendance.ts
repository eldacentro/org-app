export type AttendanceCongregation = {
  // null representa "borrado a propósito" — a diferencia de undefined, no
  // se pierde al cifrar (JSON.stringify) ni al fusionar con datos
  // remotos durante la sincronización E2E, así que un valor borrado no
  // puede "resucitar" con el número anterior tras sincronizar.
  present: number | null;
  online: number | null;
  type: string;
  updatedAt: string;
};

export type WeeklyAttendance = {
  midweek: AttendanceCongregation[];
  weekend: AttendanceCongregation[];
};

export type MeetingAttendanceType = {
  _deleted: { value: boolean; updatedAt: string };
  month_date: string;
  week_1: WeeklyAttendance;
  week_2: WeeklyAttendance;
  week_3: WeeklyAttendance;
  week_4: WeeklyAttendance;
  week_5: WeeklyAttendance;
};

export type MeetingAttendanceExport = {
  lang: string;
  locale: string;
  data: {
    name: string;
    years: string[];
    midweek_meeting: {
      month: string;
      table_1: {
        count: string | number;
        total: string | number;
        average: string | number;
      };
      table_2: {
        count: string | number;
        total: string | number;
        average: string | number;
      };
    }[];
    midweek_average: number[];
    weekend_meeting: {
      month: string;
      table_1: {
        count: string | number;
        total: string | number;
        average: string | number;
      };
      table_2: {
        count: string | number;
        total: string | number;
        average: string | number;
      };
    }[];
    weekend_average: number[];
  }[];
};
