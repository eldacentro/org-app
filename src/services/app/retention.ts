import appDb from '@db/appDb';
import { PersonType } from '@definition/person';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { MeetingAttendanceType } from '@definition/meeting_attendance';
import { dbFieldServiceReportsBulkSave } from '@services/dexie/cong_field_service_reports';
import { dbPersonsBulkSave } from '@services/dexie/persons';
import { dbMeetingAttendanceSave } from '@services/dexie/meeting_attendance';
import { displaySnackNotification } from '@services/states/app';

/**
 * Norma de conservación de registros (instrucciones de la sucursal):
 *
 * - Publicador ACTIVO: se conservan los informes del año de servicio en
 *   curso y del anterior. Todo lo anterior se elimina, y cada nuevo año de
 *   servicio la ventana rueda sola.
 * - Publicador (bautizado) INACTIVO: se conserva solo el año de servicio en
 *   que quedó inactivo (el de sus últimos informes).
 * - Publicador NO BAUTIZADO inactivo: no se conserva nada.
 * - SACADO (expulsado/desasociado): no se conserva nada.
 * - Asistencia a las reuniones: año de servicio en curso y anterior.
 * - Los nombramientos (precursorados) cerrados anteriores a la ventana de
 *   conservación de la persona se eliminan igual que sus informes; los
 *   abiertos (de continuo) nunca se tocan.
 *
 * La purga es un TOMBSTONE (se propaga por sync a toda la congregación) y
 * corre automáticamente una vez al día en los dispositivos de administradores
 * (ver triggerRetentionPurge), avisando de lo eliminado.
 */

const NEVER = '9999/99';

/** 'YYYY/MM' → inicio de su año de servicio ('YYYY/09'). */
export const serviceYearStartOf = (month: string) => {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m >= 9 ? `${y}/09` : `${y - 1}/09`;
};

/** Inicio del año de servicio ANTERIOR al que contiene `today` (ventana de
 *  conservación de los activos). */
export const retentionWindowStart = (today: Date) => {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const currentSYStartYear = m >= 9 ? y : y - 1;
  return `${currentSYStartYear - 1}/09`;
};

export type RetentionPlan = {
  reportsToDelete: { report: CongFieldServiceReportType; name: string }[];
  attendanceToDelete: MeetingAttendanceType[];
  enrollmentsToDelete: { person: PersonType; enrollmentId: string; name: string }[];
};

export const computeRetentionPlan = (
  persons: PersonType[],
  reports: CongFieldServiceReportType[],
  attendances: MeetingAttendanceType[],
  today: Date
): RetentionPlan => {
  const windowStart = retentionWindowStart(today);

  const plan: RetentionPlan = {
    reportsToDelete: [],
    attendanceToDelete: [],
    enrollmentsToDelete: [],
  };

  // Guardas de seguridad: en un dispositivo recién sincronizado (o a medias)
  // no hay datos suficientes para decidir nada — no tocar.
  const alivePersons = persons.filter((p) => !p._deleted?.value);
  if (alivePersons.length === 0 || reports.length === 0) return plan;

  const byUid = new Map(alivePersons.map((p) => [p.person_uid, p]));

  const aliveReports = reports.filter((r) => !r.report_data._deleted);
  const reportsByUid = new Map<string, CongFieldServiceReportType[]>();
  for (const r of aliveReports) {
    const list = reportsByUid.get(r.report_data.person_uid);
    if (list) list.push(r);
    else reportsByUid.set(r.report_data.person_uid, [r]);
  }

  for (const [uid, personReports] of reportsByUid) {
    const person = byUid.get(uid);
    // informes de personas que este dispositivo aún no tiene (o borradas):
    // no decidir sobre ellos aquí.
    if (!person) continue;

    const pd = person.person_data;
    const name = `${pd.person_firstname.value} ${pd.person_lastname.value}`.trim();

    const hasOpen = (hist: { _deleted: boolean; end_date: string | null }[]) =>
      (hist ?? []).some((h) => !h._deleted && !h.end_date);

    const isActivePublisher =
      hasOpen(pd.publisher_baptized?.history) ||
      hasOpen(pd.publisher_unbaptized?.history);

    const everBaptized =
      (pd.publisher_baptized?.history ?? []).some((h) => !h._deleted) ||
      Boolean(pd.publisher_baptized?.baptism_date?.value);

    // mes mínimo que se conserva (NEVER = no se conserva nada)
    let allowedFrom: string;
    let allowedToSYOnly: string | null = null; // si se limita a UN año de servicio

    if (pd.disqualified?.value) {
      // Sacado: no se conserva
      allowedFrom = NEVER;
    } else if (isActivePublisher) {
      // Activo: año en curso + anterior
      allowedFrom = windowStart;
    } else if (everBaptized) {
      // Bautizado inactivo: solo el año de servicio de sus últimos informes
      const last = personReports
        .map((r) => r.report_data.report_date)
        .sort()
        .at(-1);
      if (!last) {
        allowedFrom = NEVER;
      } else {
        allowedFrom = serviceYearStartOf(last);
        allowedToSYOnly = allowedFrom;
      }
    } else if ((pd.publisher_unbaptized?.history ?? []).some((h) => !h._deleted)) {
      // No bautizado inactivo: no se conserva
      allowedFrom = NEVER;
    } else {
      // Nunca fue publicador (estudiantes, etc.): ventana normal por si acaso
      allowedFrom = windowStart;
    }

    const monthAllowed = (month: string) => {
      if (allowedFrom === NEVER) return false;
      if (allowedToSYOnly) return serviceYearStartOf(month) === allowedToSYOnly;
      return month >= allowedFrom;
    };

    for (const r of personReports) {
      if (!monthAllowed(r.report_data.report_date)) {
        plan.reportsToDelete.push({ report: r, name });
      }
    }

    // Nombramientos cerrados fuera de la ventana de conservación de la persona
    for (const e of pd.enrollments ?? []) {
      if (e._deleted || !e.end_date) continue; // los abiertos no se tocan
      const endMonth = e.end_date.slice(0, 7);
      if (!monthAllowed(endMonth)) {
        plan.enrollmentsToDelete.push({ person, enrollmentId: e.id, name });
      }
    }
  }

  // Asistencia: ventana global (año en curso + anterior)
  for (const att of attendances) {
    if (att._deleted?.value) continue;
    if (att.month_date < windowStart) {
      plan.attendanceToDelete.push(att);
    }
  }

  return plan;
};

export const executeRetentionPurge = async (today = new Date()) => {
  const persons = await appDb.persons.toArray();
  const reports = await appDb.cong_field_service_reports.toArray();
  const attendances = await appDb.meeting_attendance.toArray();

  const plan = computeRetentionPlan(persons, reports, attendances, today);

  const NOW = new Date().toISOString();

  if (plan.reportsToDelete.length > 0) {
    const updated = plan.reportsToDelete.map(({ report }) => {
      const r = structuredClone(report);
      r.report_data._deleted = true;
      r.report_data.updatedAt = NOW;
      return r;
    });
    await dbFieldServiceReportsBulkSave(updated);
  }

  if (plan.enrollmentsToDelete.length > 0) {
    const byPerson = new Map<string, PersonType>();
    for (const { person, enrollmentId } of plan.enrollmentsToDelete) {
      const p =
        byPerson.get(person.person_uid) ?? structuredClone(person);
      const e = p.person_data.enrollments.find((x) => x.id === enrollmentId);
      if (e) {
        e._deleted = true;
        e.updatedAt = NOW;
      }
      byPerson.set(p.person_uid, p);
    }
    await dbPersonsBulkSave([...byPerson.values()]);
  }

  for (const att of plan.attendanceToDelete) {
    const a = structuredClone(att);
    a._deleted = { value: true, updatedAt: NOW };
    await dbMeetingAttendanceSave(a);
  }

  return {
    reports: plan.reportsToDelete.length,
    enrollments: plan.enrollmentsToDelete.length,
    attendanceMonths: plan.attendanceToDelete.length,
    detail: plan,
  };
};

const RETENTION_CHECK_KEY = 'organized_retention_last_check';

/**
 * Comprobación diaria automática (solo dispositivos de administradores). El
 * cálculo es idempotente: cuando no hay nada fuera de la ventana no escribe
 * nada. Al entrar el nuevo año de servicio (1-sep) la ventana rueda y purga
 * el año que sale.
 */
export const triggerRetentionPurge = async (isAdmin: boolean) => {
  if (!isAdmin) return;

  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(RETENTION_CHECK_KEY) === todayKey) return;

    const result = await executeRetentionPurge();

    localStorage.setItem(RETENTION_CHECK_KEY, todayKey);

    if (result.reports > 0 || result.attendanceMonths > 0 || result.enrollments > 0) {
      console.info(
        '[retención] purga aplicada:',
        JSON.stringify({
          informes: result.detail.reportsToDelete.map(
            (x) => `${x.name} ${x.report.report_data.report_date}`
          ),
          asistencia: result.detail.attendanceToDelete.map((a) => a.month_date),
          nombramientos: result.detail.enrollmentsToDelete.map((x) => x.name),
        })
      );

      displaySnackNotification({
        header: 'Norma de conservación aplicada',
        message: `Se han eliminado los datos fuera del período de conservación: ${result.reports} informes, ${result.attendanceMonths} meses de asistencia y ${result.enrollments} nombramientos antiguos.`,
        severity: 'success',
      });
    }
  } catch (error) {
    console.error('[retención] error en la purga:', error);
  }
};
