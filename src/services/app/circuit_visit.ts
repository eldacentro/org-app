import { UpdateSpec } from 'dexie';
import appDb from '@db/appDb';
import { dbSchedUpdate } from '@services/dexie/schedules';
import { Week } from '@definition/week_type';
import { WeekTypeCongregation, SchedWeekType } from '@definition/schedules';
import { CircuitVisitType } from '@definition/circuit_visit';
import { addDays, formatDate, getWeekDate } from '@utils/date';

// El auto-marcado de la semana de la visita escribe en el MISMO sitio que el
// selector manual de tipo de semana (schedule.<meeting>.week_type), para que
// `schedules.ts` y las vistas se auto-ajusten SIN tocar su lógica de lectura.
// CO_VISIT afecta a las dos reuniones (entre semana y fin de semana), igual que
// hace useWeekTypeSelector.

const DATA_VIEW = 'main';

const withValue = (
  current: WeekTypeCongregation[] | undefined,
  value: Week
): WeekTypeCongregation[] => {
  const next = structuredClone(current ?? []);
  const record = next.find((r) => r.type === DATA_VIEW);

  if (record) {
    record.value = value;
    record.updatedAt = new Date().toISOString();
  } else {
    next.push({ type: DATA_VIEW, value, updatedAt: new Date().toISOString() });
  }

  return next;
};

// Solo revierte una reunión si ahora mismo está en CO_VISIT, para no pisar una
// semana que alguien marcó a mano como Asamblea/Congreso/etc.
const revertedFromCo = (
  current: WeekTypeCongregation[] | undefined
): WeekTypeCongregation[] => {
  const next = structuredClone(current ?? []);
  const record = next.find((r) => r.type === DATA_VIEW);

  if (record && record.value === Week.CO_VISIT) {
    record.value = Week.NORMAL;
    record.updatedAt = new Date().toISOString();
  }

  return next;
};

const isAlreadyCoVisit = (current: WeekTypeCongregation[] | undefined) =>
  current?.find((r) => r.type === DATA_VIEW)?.value === Week.CO_VISIT;

/** Marca la semana (lunes) como semana del CO en ambas reuniones. */
export const circuitVisitMarkWeek = async (weekOf: string) => {
  const schedule = await appDb.sched.get(weekOf);
  // Semana sin schedule todavía (p. ej. futura, sin material importado): se
  // omite sin romper. Se podrá re-aplicar al crearse el schedule.
  if (!schedule) return;

  // Idempotente de verdad: si ambas reuniones ya están en CO_VISIT, no se
  // escribe nada. projectVisit() se llama en cada autoguardado de la visita
  // (comidas, predicación, etc.), así que sin este corte tocaría el schedule
  // (updatedAt + triggerSync) en cada pulsación.
  if (
    isAlreadyCoVisit(schedule.midweek_meeting?.week_type) &&
    isAlreadyCoVisit(schedule.weekend_meeting?.week_type)
  ) {
    return;
  }

  await dbSchedUpdate(weekOf, {
    'midweek_meeting.week_type': withValue(
      schedule.midweek_meeting?.week_type,
      Week.CO_VISIT
    ),
    'weekend_meeting.week_type': withValue(
      schedule.weekend_meeting?.week_type,
      Week.CO_VISIT
    ),
  } as unknown as UpdateSpec<SchedWeekType>);
};

/** Revierte la marca CO de la semana (solo si seguía en CO_VISIT). */
export const circuitVisitUnmarkWeek = async (weekOf: string) => {
  const schedule = await appDb.sched.get(weekOf);
  if (!schedule) return;

  await dbSchedUpdate(weekOf, {
    'midweek_meeting.week_type': revertedFromCo(
      schedule.midweek_meeting?.week_type
    ),
    'weekend_meeting.week_type': revertedFromCo(
      schedule.weekend_meeting?.week_type
    ),
  } as unknown as UpdateSpec<SchedWeekType>);
};

// ── Reunión especial "completa" ──────────────────────────────────────────
// Una reunión especial (precursores / ancianos y siervos ministeriales) solo
// se anuncia — Próximos eventos, agenda de la semana, resumen para ancianos
// y publicadores — cuando tiene fecha, hora Y lugar. Mientras el coordinador
// la está rellenando ("0:00", "Por definir"...), solo la ve él en su panel.
export const isSpecialMeetingComplete = (
  meeting: { date: string; time: string; place: string } | null
): meeting is { date: string; time: string; place: string } => {
  return (
    !!meeting &&
    !!meeting.date &&
    !!meeting.time &&
    meeting.time !== '0:00' &&
    // (?? ''): una visita sincronizada desde una versión antigua puede traer
    // la reunión sin el campo place — no debe tumbar el render.
    !!(meeting.place ?? '').trim()
  );
};

// ── Constructor de una visita nueva (compartido por la página de Visita y
// por Ajustes → Superintendente de circuito, para que ambos caminos creen
// exactamente la misma entidad). Movido aquí desde useCircuitVisitDashboard.
export const buildVisitForWeek = (anyDateInWeek: Date): CircuitVisitType => {
  const monday = getWeekDate(new Date(anyDateInWeek));
  const weekOf = formatDate(monday, 'yyyy/MM/dd');

  return {
    id: crypto.randomUUID(),
    _deleted: false,
    updatedAt: '',
    weekOf,
    date_start: formatDate(addDays(monday, 1), 'yyyy/MM/dd'), // martes
    date_end: formatDate(addDays(monday, 6), 'yyyy/MM/dd'), // domingo
    is_substitute: false,
    substitute_name: '',
    substitute_spouse_name: '',
    meals: [],
    co_companions: [],
    shepherding_visits: [],
    meeting_pioneers: null,
    meeting_elders: null,
    accounting_note: '',
  };
};
