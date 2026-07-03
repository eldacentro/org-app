import appDb from '@db/appDb';
import { store } from '@states/index';
import { assignmentsHistoryState } from '@states/schedules';
import { userLocalUIDState } from '@states/settings';
import { exhibitorsListState, exhibitorsSettingsState } from '@states/exhibitors';
import { getMyExhibitorTurns } from '@utils/exhibitors';
import { formatDate, getWeekDate } from '@utils/date';
import logger from '@services/logger/index';
import {
  readCalendarExportTracking,
  computeContentHashFromFields,
} from '@services/calendar_export/tracking';

/**
 * Phase 1 — client-side assignment diff.
 *
 * Reads all future assignments for the current user across every assignment
 * type (meetings, departments, service outings, exhibitors), compares against a
 * locally-persisted "seen" snapshot, and — if there are new ones — writes a
 * record to the `pending_push` IndexedDB table and shows an immediate browser
 * notification while the app is in the foreground.
 *
 * The SW reads `pending_push` when woken by a backend data-push (app closed),
 * so one code path covers both foreground and background delivery.
 *
 * Schedules are E2E-encrypted on the server, so this diff MUST run on the
 * client. It is called after every sync cycle and on app startup.
 *
 * Phase 2 adds a second, independent check — `computeCalendarUpdates` —
 * that watches assignments the user has already exported to their personal
 * calendar (`@services/calendar_export/tracking`) and flags when one of them
 * changes or disappears, so a calendar entry someone trusted doesn't go
 * silently stale. The service worker's background-message handler only ever
 * shows the SINGLE most recent unshown `pending_push` record and discards
 * any others as "shown" without displaying them — so both checks are always
 * combined into ONE write via `runAssignmentPushDiffs`, never two separate
 * ones in the same cycle (see that function for details).
 */

const SNAPSHOT_KEY = 'organized_push-seen-assignments';
const OPT_IN_KEY = 'organized_push-enabled';
const CALENDAR_OPT_IN_KEY = 'organized_calendar-export-enabled';
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const isPushEnabled = () => {
  try {
    return (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      localStorage.getItem(OPT_IN_KEY) === 'true'
    );
  } catch {
    return false;
  }
};

const isCalendarExportEnabled = () => {
  try {
    return localStorage.getItem(CALENDAR_OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
};

const readSnapshot = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const writeSnapshot = (fingerprints: Set<string>) => {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify([...fingerprints]));
  } catch {
    /* ignore */
  }
};

type NewAssignment = { title: string };

const buildNotificationContent = (
  items: NewAssignment[]
): { title: string; body: string } => {
  if (items.length === 1) {
    return {
      title: 'Nueva asignación',
      body: items[0].title,
    };
  }
  const preview = items
    .slice(0, 3)
    .map((a) => a.title)
    .join(', ');
  return {
    title: `${items.length} nuevas asignaciones`,
    body: items.length > 3 ? `${preview}…` : preview,
  };
};

const buildCalendarChangedContent = (
  items: NewAssignment[]
): { title: string; body: string } => {
  if (items.length === 1) {
    return {
      title: 'Tu asignación cambió',
      body: `${items[0].title} — actualiza tu calendario`,
    };
  }
  const preview = items
    .slice(0, 3)
    .map((a) => a.title)
    .join(', ');
  return {
    title: `${items.length} asignaciones cambiaron`,
    body: `${items.length > 3 ? `${preview}…` : preview} — actualiza tu calendario`,
  };
};

const buildCalendarRemovedContent = (
  items: NewAssignment[]
): { title: string; body: string } => {
  if (items.length === 1) {
    return {
      title: 'Ya no tienes esa asignación',
      body: `${items[0].title} — puedes borrar el evento de tu calendario`,
    };
  }
  const preview = items
    .slice(0, 3)
    .map((a) => a.title)
    .join(', ');
  return {
    title: `${items.length} asignaciones ya no son tuyas`,
    body: `${items.length > 3 ? `${preview}…` : preview} — puedes borrar esos eventos`,
  };
};

/** Combines whichever categories have content into a single notification —
 *  the SW can only ever surface one `pending_push` record per wake, so this
 *  must never write more than one. When only one category fired, the copy
 *  matches exactly what that category would have shown alone (no behavior
 *  change for the common case). */
const buildCombinedNotificationContent = (
  newAssignments: NewAssignment[],
  changed: NewAssignment[],
  removed: NewAssignment[]
): { title: string; body: string } => {
  const activeCategories = [
    newAssignments.length > 0,
    changed.length > 0,
    removed.length > 0,
  ].filter(Boolean).length;

  if (activeCategories <= 1) {
    if (newAssignments.length > 0) return buildNotificationContent(newAssignments);
    if (changed.length > 0) return buildCalendarChangedContent(changed);
    return buildCalendarRemovedContent(removed);
  }

  const parts: string[] = [];
  if (newAssignments.length > 0) parts.push(`${newAssignments.length} nueva(s)`);
  if (changed.length > 0) parts.push(`${changed.length} cambiada(s)`);
  if (removed.length > 0) parts.push(`${removed.length} eliminada(s)`);

  return {
    title: 'Novedades en tus asignaciones',
    body: parts.join(' · '),
  };
};

/** Purge pending_push records older than 7 days to keep the table lean. */
const cleanOldPendingPush = async () => {
  const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString();
  await appDb.pending_push
    .where('createdAt')
    .below(cutoff)
    .delete()
    .catch(() => {});
};

/** Computes the list of assignments new since the last check, and persists
 *  the current snapshot as a side effect (same as before the Phase 2 split —
 *  the snapshot must always update, whether or not a notification is shown). */
const computeNewAssignments = async (): Promise<NewAssignment[]> => {
  if (!isPushEnabled()) return [];

  const userUID = store.get(userLocalUIDState);
  if (!userUID) return [];

  const today = formatDate(getWeekDate(new Date()), 'yyyy/MM/dd');

  const snapshot = readSnapshot();
  const currentFingerprints = new Set<string>();
  const newAssignments: NewAssignment[] = [];

  const mark = (fp: string, title: string) => {
    currentFingerprints.add(fp);
    if (!snapshot.has(fp)) newAssignments.push({ title });
  };

  // ── 1. Meeting assignments (midweek + weekend) ─────────────────────────────
  const history = store.get(assignmentsHistoryState);
  for (const record of history) {
    if (record.assignment.person !== userUID) continue;
    if (record.weekOf < today) continue;
    mark(
      `${record.weekOf}|${record.assignment.key ?? record.assignment.code}|${userUID}`,
      record.assignment.title
    );
  }

  // ── 2. Departamentos (acomodadores, micrófonos, multimedia, plataforma) ────
  try {
    const deptWeeks = await appDb.departments_schedule
      .where('weekOf')
      .aboveOrEqual(today)
      .toArray();

    const DEPTS = ['acomodadores', 'microfonos', 'multimedia', 'plataforma'] as const;
    const DEPT_LABELS: Record<string, string> = {
      acomodadores: 'Acomodadores',
      microfonos: 'Micrófonos',
      multimedia: 'Multimedia',
      plataforma: 'Plataforma',
    };

    for (const week of deptWeeks) {
      for (const dept of DEPTS) {
        const deptData = week[dept] as Record<string, { value: string }>;
        if (!deptData) continue;
        for (const [role, data] of Object.entries(deptData)) {
          if (data?.value !== userUID) continue;
          mark(
            `${week.weekOf}|DEPT_${dept}_${role}|${userUID}`,
            `${DEPT_LABELS[dept]} (${role})`
          );
        }
      }
    }
  } catch {
    /* table may be empty */
  }

  // ── 3. Salidas de predicación ──────────────────────────────────────────────
  try {
    const outingWeeks = await appDb.service_outings
      .where('weekOf')
      .aboveOrEqual(today)
      .toArray();

    for (const week of outingWeeks) {
      if (!week.outings) continue;
      for (const outing of week.outings) {
        if (
          outing.person !== userUID ||
          outing.cancelled ||
          outing.date < today
        )
          continue;
        mark(
          `${week.weekOf}|OUTING_${outing.id}|${userUID}`,
          'Salida de predicación'
        );
      }
    }
  } catch {
    /* table may be empty */
  }

  // ── 4. Exhibidores ─────────────────────────────────────────────────────────
  try {
    const exhibitorWeeks = await appDb.exhibitors
      .where('weekOf')
      .aboveOrEqual(today)
      // 'settings' row sorts above date strings in Unicode, exclude it
      .and((w) => w.weekOf !== 'settings')
      .toArray();

    for (const week of exhibitorWeeks) {
      if (!week.turns) continue;
      for (const turn of week.turns as import('@definition/exhibitors').ExhibitorWeekTurnType[]) {
        if (turn.cancelled || turn.date < today) continue;
        const myAss = turn.assignments?.find((a) => a.person === userUID);
        if (!myAss) continue;
        mark(
          `${week.weekOf}|EXHIBITOR_${turn.turnId}_${turn.date}|${userUID}`,
          myAss.isResponsible ? 'Exhibidores: Responsable de turno' : 'Exhibidores'
        );
      }
    }
  } catch {
    /* table may be empty */
  }

  // Always persist the current snapshot (also removes stale past entries)
  writeSnapshot(currentFingerprints);

  return newAssignments;
};

/**
 * Phase 2 — detects when an assignment the user already exported to their
 * calendar changes or disappears.
 *
 * Deliberately narrow in scope: only re-derives assignments this module can
 * cheaply and EXACTLY reconstruct with the same `.id` that
 * `useAssignments.ts` used when the row was exported — meeting parts
 * (`.id` = the schedule's own stable id, read directly from the shared
 * `assignmentsHistoryState` atom), salidas de predicación (`.id` = `outing.id`),
 * and exhibidores (`.id` = `${turnId}_${date}`). Departamentos, Limpieza and
 * Visita del CO ids depend on extra joins (meeting-day resolution, rotation
 * config) this module doesn't otherwise need — reconstructing those exactly
 * risks a subtly wrong id that either silently never matches (harmless but
 * useless) or, worse, matches something it shouldn't. Exporting those types
 * to the calendar still works fine; they just don't trigger a "changed" push
 * in this version. Tracked ids for those types are recognizable by their
 * `DEPT_`/`LIMPIEZA_`/`COVISIT_` prefix and are skipped rather than
 * misclassified as "removed".
 */
const computeCalendarUpdates = async (): Promise<{
  changed: NewAssignment[];
  removed: NewAssignment[];
}> => {
  const empty = { changed: [], removed: [] };

  if (!isPushEnabled() || !isCalendarExportEnabled()) return empty;

  const tracking = readCalendarExportTracking();
  const trackedIds = Object.keys(tracking);
  if (trackedIds.length === 0) return empty;

  const userUID = store.get(userLocalUIDState);
  if (!userUID) return empty;

  const today = formatDate(getWeekDate(new Date()), 'yyyy/MM/dd');

  const currentById = new Map<string, { title: string; hash: string }>();

  // ── Meeting assignments ─────────────────────────────────────────────────
  const history = store.get(assignmentsHistoryState);
  for (const record of history) {
    if (record.assignment.person !== userUID) continue;
    if (record.weekOf < today) continue;
    currentById.set(record.id, {
      title: record.assignment.title,
      hash: computeContentHashFromFields({
        title: record.assignment.title,
        date: record.actualDate || record.weekOf,
        person: record.assignment.person,
        startTime: record.assignment.startTime,
        endTime: record.assignment.endTime,
      }),
    });
  }

  // ── Salidas de predicación ──────────────────────────────────────────────
  try {
    const outingWeeks = await appDb.service_outings
      .where('weekOf')
      .aboveOrEqual(today)
      .toArray();

    for (const week of outingWeeks) {
      if (!week.outings) continue;
      for (const outing of week.outings) {
        if (
          outing.person !== userUID ||
          outing.cancelled ||
          outing.date < today
        )
          continue;
        const title = 'Salida de predicación';
        currentById.set(outing.id, {
          title,
          hash: computeContentHashFromFields({
            title,
            date: outing.date,
            person: userUID,
            startTime: outing.time,
          }),
        });
      }
    }
  } catch {
    /* table may be empty */
  }

  // ── Exhibidores ─────────────────────────────────────────────────────────
  // Los turnos crudos de Dexie (`exhibitors`) no traen startTime/endTime —
  // esos viven en `exhibitorsSettings` (config de turnos por día de semana).
  // Se reutiliza `getMyExhibitorTurns`, la misma utilidad que ya usa
  // `useAssignments.ts` para construir estas filas, para no reconstruir mal
  // esa unión aquí.
  try {
    const exhibitors = store.get(exhibitorsListState);
    const exhibitorsSettings = store.get(exhibitorsSettingsState);
    const exhibitorMaxDate = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

    const turns = getMyExhibitorTurns(
      exhibitors,
      exhibitorsSettings,
      userUID,
      new Date(),
      today,
      formatDate(exhibitorMaxDate, 'yyyy/MM/dd')
    );

    for (const turn of turns) {
      const id = `${turn.turnId}_${turn.date}`;
      const title = turn.isResponsible ? 'Exhibidores: Responsable de turno' : 'Exhibidores';
      currentById.set(id, {
        title,
        hash: computeContentHashFromFields({
          title,
          date: turn.date,
          person: userUID,
          startTime: turn.startTime,
          endTime: turn.endTime,
        }),
      });
    }
  } catch {
    /* table may be empty */
  }

  const changed: NewAssignment[] = [];
  const removed: NewAssignment[] = [];

  const EXCLUDED_PREFIXES = ['DEPT_', 'LIMPIEZA_', 'COVISIT_'];

  for (const id of trackedIds) {
    if (EXCLUDED_PREFIXES.some((prefix) => id.startsWith(prefix))) continue;

    const entry = tracking[id];
    const current = currentById.get(id);

    if (!current) {
      removed.push({ title: entry.title });
      continue;
    }

    if (current.hash !== entry.contentHash) {
      changed.push({ title: current.title });
    }
  }

  return { changed, removed };
};

/** Writes+shows a single combined notification for whatever `pending_push`-
 *  worthy content the two diffs produced, and does the shared cleanup. No-op
 *  if there's nothing to report. */
const writeAndShowNotification = async (
  newAssignments: NewAssignment[],
  changed: NewAssignment[],
  removed: NewAssignment[]
): Promise<void> => {
  if (newAssignments.length === 0 && changed.length === 0 && removed.length === 0) return;

  const { title, body } = buildCombinedNotificationContent(newAssignments, changed, removed);

  const notifUrl = '/#/weekly-schedules';

  try {
    await appDb.pending_push.add({
      title,
      body,
      tag: 'assignment-update',
      url: notifUrl,
      createdAt: new Date().toISOString(),
      shown: 0,
    });
  } catch (err) {
    logger.error('push', `failed to write pending_push: ${err}`);
  }

  try {
    new Notification(title, {
      body,
      icon: '/img/icon/icon-192x192.png',
      badge: '/img/icon/icon-monochrome-192x192.png',
      tag: 'assignment-update',
    });

    // Mark all pending records as shown so the SW doesn't re-display them
    // if an FCM push arrives shortly after (race condition guard).
    await appDb.pending_push.where('shown').equals(0).modify({ shown: 1 }).catch(() => {});

    // Set app badge so the icon shows a dot until the user opens the app
    if ('setAppBadge' in navigator) navigator.setAppBadge(1).catch(() => {});
  } catch (err) {
    logger.error('push', `failed to show foreground notification: ${err}`);
  }

  await cleanOldPendingPush();
};

/** Public entry point used at app-lifecycle call sites (sync completion,
 *  app startup). Runs both diffs and writes AT MOST one combined
 *  notification — see the module doc for why they can't write separately. */
export const runAssignmentPushDiffs = async (): Promise<void> => {
  const newAssignments = await computeNewAssignments();
  const { changed, removed } = await computeCalendarUpdates();

  await writeAndShowNotification(newAssignments, changed, removed);
};

/**
 * Kept as its own export for the one remaining direct call site
 * (`usePushNotifications.tsx`, seeding the "seen assignments" snapshot
 * silently right after the user enables push — `notify: false`). The
 * calendar-export tracking map always starts empty for a user, so there's
 * nothing to seed there; it doesn't need to run on that path.
 */
export const checkAndQueueAssignmentPush = async ({ notify = true }: { notify?: boolean } = {}): Promise<void> => {
  const newAssignments = await computeNewAssignments();

  if (newAssignments.length === 0) return;
  if (!notify) return;

  await writeAndShowNotification(newAssignments, [], []);
};
