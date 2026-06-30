import { CircuitVisitType } from '@definition/circuit_visit';
import { UpcomingEventCategory, UpcomingEventDuration } from '@definition/upcoming_events';
import {
  dbServiceOutingsGetWeek,
  dbServiceOutingsSaveWeek,
} from '@services/dexie/service_outings';
import {
  dbUpcomingEventGetAll,
  dbUpcomingEventsSave,
} from '@services/dexie/upcoming_events';
import {
  circuitVisitMarkWeek,
  circuitVisitUnmarkWeek,
} from './circuit_visit';

/**
 * Proyección de la Visita hacia los lugares de la app que YA existen y que
 * antes había que marcar a mano por separado: el horario (semana del CO),
 * Salidas de predicación (banner "Semana del Superintendente") y Próximos
 * eventos (para que las reuniones especiales salgan en el dashboard).
 *
 * Principios (para no romper nada):
 * - Solo ESCRIBE marcadores derivados; nunca cambia cómo leen las páginas
 *   existentes esos campos.
 * - Idempotente: volver a proyectar la misma visita dos veces da el mismo
 *   resultado (ids/claves estables).
 * - Reversible: unprojectVisit() borra exactamente lo que projectVisit()
 *   creó, nada más.
 * - Tolerante: si el destino aún no existe (p. ej. semana futura sin
 *   schedule todavía), se omite sin lanzar error.
 */

const eventId = (visitId: string, suffix: string) => `covisit_${visitId}_${suffix}`;

const upsertWeekEvent = async (visit: CircuitVisitType) => {
  const all = await dbUpcomingEventGetAll();
  const id = eventId(visit.id, 'week');
  const existing = all.find((e) => e.event_uid === id);

  // Idempotente: si ya existe con las mismas fechas y sin estar borrado, no
  // se reescribe. projectVisit() se llama en cada autoguardado de la visita
  // (comidas, predicación, etc.), que no cambian date_start/date_end.
  if (
    existing &&
    !existing.event_data._deleted &&
    existing.event_data.start === visit.date_start &&
    existing.event_data.end === visit.date_end
  ) {
    return;
  }

  await dbUpcomingEventsSave({
    event_uid: id,
    _deleted: existing?._deleted ?? false,
    updatedAt: new Date().toISOString(),
    event_data: {
      _deleted: false,
      updatedAt: new Date().toISOString(),
      start: visit.date_start,
      end: visit.date_end,
      type: 'main',
      category: UpcomingEventCategory.CircuitOverseerWeek,
      duration: UpcomingEventDuration.MultipleDays,
      description: '',
    },
  });
};

const upsertSpecialMeetingEvent = async (
  visit: CircuitVisitType,
  suffix: 'pioneers' | 'elders',
  label: string,
  meeting: { date: string; time: string; place: string } | null
) => {
  const all = await dbUpcomingEventGetAll();
  const id = eventId(visit.id, suffix);
  const existing = all.find((e) => e.event_uid === id);

  // Sin esta reunión programada: si existía un evento previo (se quitó),
  // se borra lógicamente. Si nunca existió, no hay nada que hacer.
  if (!meeting || !meeting.date) {
    if (existing && !existing.event_data._deleted) {
      await dbUpcomingEventsSave({
        ...existing,
        updatedAt: new Date().toISOString(),
        event_data: {
          ...existing.event_data,
          _deleted: true,
          updatedAt: new Date().toISOString(),
        },
      });
    }
    return;
  }

  const custom = meeting.place
    ? `${label} — ${meeting.place}`
    : label;

  // Idempotente: sin cambios reales, no se reescribe.
  if (
    existing &&
    !existing.event_data._deleted &&
    existing.event_data.start === meeting.date &&
    existing.event_data.description === meeting.time &&
    existing.event_data.custom === custom
  ) {
    return;
  }

  await dbUpcomingEventsSave({
    event_uid: id,
    _deleted: false,
    updatedAt: new Date().toISOString(),
    event_data: {
      _deleted: false,
      updatedAt: new Date().toISOString(),
      start: meeting.date,
      end: meeting.date,
      type: 'main',
      category: UpcomingEventCategory.Custom,
      duration: UpcomingEventDuration.SingleDay,
      description: meeting.time,
      custom,
    },
  });
};

const softDeleteVisitEvents = async (visitId: string) => {
  const all = await dbUpcomingEventGetAll();
  const ids = ['week', 'pioneers', 'elders'].map((s) => eventId(visitId, s));

  for (const id of ids) {
    const existing = all.find((e) => e.event_uid === id);
    if (existing && !existing.event_data._deleted) {
      await dbUpcomingEventsSave({
        ...existing,
        updatedAt: new Date().toISOString(),
        event_data: {
          ...existing.event_data,
          _deleted: true,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  }
};

const markServiceOutingsWeek = async (weekOf: string) => {
  const existing = await dbServiceOutingsGetWeek(weekOf);

  // Semana sin registro de salidas todavía: se omite. La pestaña de
  // predicación de la Visita crea el registro al guardar la primera
  // salida, y reconcile() reaplicará la marca después.
  if (!existing) return;
  if (existing.isCircuitOverseerWeek) return;

  await dbServiceOutingsSaveWeek({
    ...existing,
    isCircuitOverseerWeek: true,
  });
};

const unmarkServiceOutingsWeek = async (weekOf: string) => {
  const existing = await dbServiceOutingsGetWeek(weekOf);
  if (!existing || !existing.isCircuitOverseerWeek) return;

  await dbServiceOutingsSaveWeek({
    ...existing,
    isCircuitOverseerWeek: false,
  });
};

/** Aplica todos los marcadores derivados de la visita. Idempotente. */
export const projectVisit = async (visit: CircuitVisitType) => {
  await circuitVisitMarkWeek(visit.weekOf);
  await markServiceOutingsWeek(visit.weekOf);
  await upsertWeekEvent(visit);
  await upsertSpecialMeetingEvent(
    visit,
    'pioneers',
    'Reunión con precursores',
    visit.meeting_pioneers
  );
  await upsertSpecialMeetingEvent(
    visit,
    'elders',
    'Reunión con ancianos y siervos ministeriales',
    visit.meeting_elders
  );
};

/** Revierte exactamente lo que projectVisit() creó para esta visita. */
export const unprojectVisit = async (visit: CircuitVisitType) => {
  await circuitVisitUnmarkWeek(visit.weekOf);
  await unmarkServiceOutingsWeek(visit.weekOf);
  await softDeleteVisitEvents(visit.id);
};

/**
 * Re-aplica la proyección de todas las visitas activas. Pensado para
 * llamarse tras cargar los datos locales (useIndexedDb), porque
 * projectVisit() omite en silencio los destinos que aún no existen (p. ej.
 * una semana futura sin schedule todavía); reconcile() les da otra
 * oportunidad cuando ya existen. Es idempotente, así que llamarlo de más
 * no tiene efecto secundario.
 */
export const reconcileAllVisits = async (visits: CircuitVisitType[]) => {
  for (const visit of visits) {
    if (visit._deleted) continue;
    await projectVisit(visit);
  }
};
