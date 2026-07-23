import appDb from '@db/appDb';
import { CircuitVisitType } from '@definition/circuit_visit';
import {
  projectVisit,
  runExclusiveVisitOp,
  unprojectVisit,
} from '@services/app/circuit_visit_projection';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { addDays, formatDate, getWeekDate } from '@utils/date';

// ── Espejo con la lista ligera de Ajustes (settings.circuit_overseer.visits) ──
// Esa lista es la que leen la página de Ajustes → Superintendente de circuito
// y dbSchedCheck (programas creados después de fijar la visita). Mantenerla
// sincronizada aquí hace que dé igual desde qué pantalla se cree/borre la
// visita: ambas fuentes cuentan lo mismo.

const upsertSettingsVisitEntry = async (visit: CircuitVisitType) => {
  const settings = await appDb.app_settings.get(1);
  if (!settings) return;

  const visits = structuredClone(
    settings.cong_settings.circuit_overseer.visits
  );

  // Ya hay una entrada viva para esa semana → nada que hacer (idempotente:
  // esto corre en cada autoguardado de la visita).
  if (visits.some((v) => v._deleted === false && v.weekOf === visit.weekOf)) {
    return;
  }

  visits.push({
    _deleted: false,
    id: visit.id,
    updatedAt: new Date().toISOString(),
    weekOf: visit.weekOf,
  });

  await dbAppSettingsUpdate({
    'cong_settings.circuit_overseer.visits': visits,
  });
};

const tombstoneSettingsVisitEntries = async (weekOf: string) => {
  if (!weekOf) return;

  const settings = await appDb.app_settings.get(1);
  if (!settings) return;

  const visits = structuredClone(
    settings.cong_settings.circuit_overseer.visits
  );

  let changed = false;
  for (const record of visits) {
    if (record._deleted === false && record.weekOf === weekOf) {
      record._deleted = true;
      record.updatedAt = new Date().toISOString();
      changed = true;
    }
  }

  if (!changed) return;

  await dbAppSettingsUpdate({
    'cong_settings.circuit_overseer.visits': visits,
  });
};

const triggerSync = () => {
  import('@services/worker/backupWorker').then(({ default: worker }) =>
    worker.postMessage('startWorker')
  );
};

const dbUpdateCircuitVisitMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.circuit_overseer_visits = {
    ...metadata.metadata.circuit_overseer_visits,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbCircuitVisitGetAll = async (): Promise<CircuitVisitType[]> => {
  return await appDb.circuit_overseer_visits.toArray();
};

// Todas las mutaciones corren bajo runExclusiveVisitOp: nunca se solapan
// entre sí ni con reconcileAllVisits (ver nota del candado en la proyección).
export const dbCircuitVisitSave = async (visit: CircuitVisitType) =>
  runExclusiveVisitOp(async () => {
    const record: CircuitVisitType = {
      ...visit,
      updatedAt: new Date().toISOString(),
    };

    await appDb.circuit_overseer_visits.put(record);
    await dbUpdateCircuitVisitMetadata();

    if (!record._deleted) {
      await projectVisit(record);
      await upsertSettingsVisitEntry(record);
    }

    triggerSync();

    return record;
  });

/**
 * Mueve una visita a otra semana. Orden CRÍTICO: primero se des-proyecta la
 * semana antigua (tombstones con T1), y DESPUÉS se estampa el updatedAt nuevo
 * del registro (T2 > T1) antes de re-proyectar — si fuera al revés, el guard
 * anti-resurrección de la proyección vería el tombstone más nuevo que la
 * visita y se negaría a re-crear los eventos en la semana nueva.
 */
export const dbCircuitVisitMoveWeek = async (
  id: string,
  anyDateInNewWeek: Date
) =>
  runExclusiveVisitOp(async () => {
    const existing = await appDb.circuit_overseer_visits.get(id);
    if (!existing || existing._deleted) return;

    const monday = getWeekDate(new Date(anyDateInNewWeek));
    const weekOf = formatDate(monday, 'yyyy/MM/dd');

    if (weekOf === existing.weekOf) return existing;

    await unprojectVisit(existing);
    await tombstoneSettingsVisitEntries(existing.weekOf);

    const dateStart = formatDate(addDays(monday, 1), 'yyyy/MM/dd'); // martes
    const dateEnd = formatDate(addDays(monday, 6), 'yyyy/MM/dd'); // domingo

    // Al mover la visita a otra semana hay que ARRASTRAR con ella todo lo que
    // cuelga de un día concreto (reuniones especiales, comidas, pastoreo y las
    // salidas de acompañamiento). Si no, esas fechas se quedan en la semana
    // vieja, caen fuera del nuevo rango martes–domingo y desaparecen de la
    // agenda de Próximos eventos (aunque sigan viéndose en la página de la
    // visita, que no filtra por rango) — bug real (2026-07-23). El
    // desplazamiento es un número entero de semanas, así que cada fecha
    // conserva su día de la semana (un miércoles sigue siendo miércoles).
    const dayDelta = Math.round(
      (new Date(dateStart).getTime() - new Date(existing.date_start).getTime()) /
        86_400_000
    );
    const shiftDate = (d: string) =>
      d ? formatDate(addDays(new Date(d), dayDelta), 'yyyy/MM/dd') : d;
    const shiftMeeting = (m: CircuitVisitType['meeting_pioneers']) =>
      m ? { ...m, date: shiftDate(m.date) } : m;

    const record: CircuitVisitType = {
      ...existing,
      weekOf,
      date_start: dateStart,
      date_end: dateEnd,
      meals: existing.meals.map((m) => ({ ...m, date: shiftDate(m.date) })),
      shepherding_visits: (existing.shepherding_visits ?? []).map((s) => ({
        ...s,
        date: shiftDate(s.date),
      })),
      // outingKey = `${date}_${time}`: la fecha embebida también se desplaza
      // para seguir apuntando a la salida del mismo día en la semana nueva.
      co_companions: (existing.co_companions ?? []).map((c) => {
        const sep = c.outingKey.indexOf('_');
        if (sep < 0) return c;
        const time = c.outingKey.slice(sep + 1);
        return { ...c, outingKey: `${shiftDate(c.outingKey.slice(0, sep))}_${time}` };
      }),
      meeting_pioneers: shiftMeeting(existing.meeting_pioneers),
      meeting_elders: shiftMeeting(existing.meeting_elders),
      updatedAt: new Date().toISOString(),
    };

    await appDb.circuit_overseer_visits.put(record);
    await dbUpdateCircuitVisitMetadata();
    await projectVisit(record);
    await upsertSettingsVisitEntry(record);

    triggerSync();

    return record;
  });

// Borrado lógico (tombstone) para que el sync propague la baja a los demás
// dispositivos, igual que el resto de entidades de la app.
export const dbCircuitVisitDelete = async (id: string) =>
  runExclusiveVisitOp(async () => {
    const existing = await appDb.circuit_overseer_visits.get(id);
    if (!existing) return;

    await appDb.circuit_overseer_visits.put({
      ...existing,
      _deleted: true,
      updatedAt: new Date().toISOString(),
    });
    await dbUpdateCircuitVisitMetadata();
    await unprojectVisit(existing);
    await tombstoneSettingsVisitEntries(existing.weekOf);
    triggerSync();
  });
