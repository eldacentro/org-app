import appDb from '@db/appDb';
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
import { addHours } from '@utils/date';

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

  // ANTI-RESURRECCIÓN (bug real, 2026-07-18): si el evento está tombstoneado
  // con fecha MÁS NUEVA que el último cambio de la visita, la baja vino de
  // otro dispositivo (borraron la visita allí y este dispositivo aún no ha
  // recibido esa baja por sync). Re-crear el evento aquí lo "resucitaría"
  // con updatedAt fresco, ganaría el merge y volvería para toda la
  // congregación. Solo se re-crea si la visita se ha vuelto a guardar
  // DESPUÉS del tombstone (restauración deliberada).
  if (
    existing?.event_data._deleted &&
    existing.event_data.updatedAt > visit.updatedAt
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

  // Anti-resurrección: mismo criterio que upsertWeekEvent — un tombstone
  // más nuevo que la visita manda (la baja vino de otro dispositivo).
  if (
    existing?.event_data._deleted &&
    existing.event_data.updatedAt > visit.updatedAt
  ) {
    return;
  }

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

  // start/end incluyen la hora real (antes solo guardaban la fecha, con
  // hora 00:00) — así "Añadir al calendario" exporta la hora correcta en
  // vez de medianoche. La hora ya no se repite en `description`: el
  // dashboard la calcula aparte a partir de start/end y la muestra en su
  // propio recuadro, así que ponerla también en la descripción quedaba
  // duplicada en la tarjeta.
  const startDate = new Date(`${meeting.date.replace(/\//g, '-')}T${meeting.time || '00:00'}:00`);
  const endDate = addHours(1, startDate);
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  // Idempotente: sin cambios reales, no se reescribe. La comparación con
  // description === '' hace que una visita ya proyectada ANTES de este
  // cambio (que guardó la hora también en description) se reescriba una
  // vez más para quitar ese texto duplicado, en vez de quedarse repetida
  // para siempre por no haber "cambiado" nada más.
  if (
    existing &&
    !existing.event_data._deleted &&
    existing.event_data.start === start &&
    existing.event_data.custom === custom &&
    existing.event_data.description === ''
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
      start,
      end,
      type: 'main',
      category: UpcomingEventCategory.Custom,
      duration: UpcomingEventDuration.SingleDay,
      description: '',
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
 * Re-aplica la proyección de TODAS las visitas (activas y borradas). Se
 * llama tras cargar los datos locales y en cada cambio de la tabla por sync
 * (useIndexedDb), porque projectVisit() omite en silencio los destinos que
 * aún no existen (p. ej. una semana futura sin schedule todavía);
 * reconcile() les da otra oportunidad cuando ya existen.
 *
 * AUTO-CURACIÓN (bug real, 2026-07-18): también des-proyecta las visitas
 * BORRADAS. Sin esto, un dispositivo que re-proyectó una visita en la
 * ventana entre el borrado en otro dispositivo y la llegada de la baja por
 * sync dejaba el evento/semana "resucitados" para siempre. Con esto, en
 * cuanto la baja llega (liveQuery → reconcile), este mismo código limpia
 * los restos y el estado converge en todos los dispositivos.
 *
 * Orden importante: primero las borradas (des-proyectar), después las
 * activas (proyectar) — así, si una semana tuviera una visita borrada y
 * otra activa, la activa re-marca lo suyo al final. Es idempotente.
 */
const reconcilePass = async () => {
  // SIEMPRE se lee fresco de la BD (no una lista pasada por el llamante):
  // dos emisiones de liveQuery pueden solaparse, y un reconcile con una
  // instantánea VIEJA que termina después re-proyectaría un estado obsoleto
  // (bug real, 2026-07-20: al mover una visita de semana, un reconcile
  // rezagado volvía a marcar la semana ANTIGUA como CO_VISIT).
  const visits = await appDb.circuit_overseer_visits.toArray();

  const activeWeeks = new Set(
    visits.filter((v) => !v._deleted).map((v) => v.weekOf)
  );

  for (const visit of visits) {
    if (!visit._deleted) continue;

    await softDeleteVisitEvents(visit.id);

    // La semana/salidas solo se des-marcan si NINGUNA visita activa cubre
    // esa misma semana — si no, cada reconcile des-marcaría y re-marcaría
    // en bucle (escrituras + sync en cada arranque).
    if (!activeWeeks.has(visit.weekOf)) {
      await circuitVisitUnmarkWeek(visit.weekOf);
      await unmarkServiceOutingsWeek(visit.weekOf);
    }
  }

  for (const visit of visits) {
    if (!visit._deleted) {
      await projectVisit(visit);
    }
  }
};

// ── Candado global de operaciones sobre visitas ──────────────────────────
// Serializa guardar/mover/borrar (servicio dexie) Y el reconcile. Sin esto,
// un reconcile disparado por otra emisión (settings, sched...) podía colarse
// EN MEDIO de un movimiento de semana (entre des-proyectar la semana vieja y
// escribir el registro nuevo), leer la visita todavía en la semana antigua y
// volver a marcarla como CO_VISIT (bug real, 2026-07-20, visto en pruebas:
// la semana vieja quedaba marcada para siempre tras mover la visita).
let visitOpChain: Promise<unknown> = Promise.resolve();

export const runExclusiveVisitOp = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = visitOpChain.then(fn, fn);
  visitOpChain = next.catch(() => undefined);
  return next;
};

// Coalescencia: si ya hay un reconcile esperando el candado, no se encola
// otro (cada pasada lee fresco, así que una sola pasada final basta).
let reconcileQueued = false;

export const reconcileAllVisits = async () => {
  if (reconcileQueued) return;
  reconcileQueued = true;

  return runExclusiveVisitOp(async () => {
    reconcileQueued = false;
    await reconcilePass();
  });
};
