import appDb from '@db/appDb';
import { store } from '@states/index';
import { assignmentsHistoryState } from '@states/schedules';
import { userLocalUIDState } from '@states/settings';
import { formatDate, getWeekDate } from '@utils/date';
import logger from '@services/logger/index';

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
 */

const SNAPSHOT_KEY = 'organized_push-seen-assignments';
const OPT_IN_KEY = 'organized_push-enabled';
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

/** Purge pending_push records older than 7 days to keep the table lean. */
const cleanOldPendingPush = async () => {
  const cutoff = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString();
  await appDb.pending_push
    .where('createdAt')
    .below(cutoff)
    .delete()
    .catch(() => {});
};

export const checkAndQueueAssignmentPush = async (): Promise<void> => {
  if (!isPushEnabled()) return;

  const userUID = store.get(userLocalUIDState);
  if (!userUID) return;

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

  if (newAssignments.length === 0) return;

  const { title, body } = buildNotificationContent(newAssignments);

  // Write to pending_push so the SW can show it when the app is closed
  try {
    await appDb.pending_push.add({
      title,
      body,
      tag: 'assignment-update',
      url: '/',
      createdAt: new Date().toISOString(),
      shown: 0,
    });
  } catch (err) {
    logger.error('push', `failed to write pending_push: ${err}`);
  }

  // Immediate foreground notification (app is open/visible)
  try {
    new Notification(title, {
      body,
      icon: '/img/icon/icon-192x192.png',
      badge: '/img/icon/icon-monochrome-192x192.png',
      tag: 'assignment-update',
    });
  } catch (err) {
    logger.error('push', `failed to show foreground notification: ${err}`);
  }

  await cleanOldPendingPush();
};
