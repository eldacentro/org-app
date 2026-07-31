/*
This file holds the source of the truth from the table "meetingAttendance".
*/

import { atom } from 'jotai';
import { MeetingAttendanceType } from '@definition/meeting_attendance';
import { retentionServiceYears, serviceYearOfMonth } from '@utils/date';

export const meetingAttendanceDbState = atom<MeetingAttendanceType[]>([]);

export const meetingAttendanceState = atom((get) => {
  const attendance = get(meetingAttendanceDbState);

  const results = attendance.filter(
    (record) => !record._deleted || !record._deleted?.value
  );

  return results;
});

/**
 * Los años de servicio que hay que ofrecer para mirar la asistencia.
 *
 * La norma solo conserva el año en curso y el anterior, así que esos dos van
 * siempre; y si por lo que fuera quedara algo más antiguo sin purgar, se
 * enseña en vez de esconderlo. Mismo criterio que con los informes, en
 * `states/field_service_reports.ts`.
 */
export const serviceYearsWithAttendanceState = atom((get) => {
  const attendance = get(meetingAttendanceState);

  const years = new Set(retentionServiceYears());

  for (const record of attendance) {
    if (record.month_date) years.add(serviceYearOfMonth(record.month_date));
  }

  return [...years].sort();
});
