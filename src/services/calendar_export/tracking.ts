import { AssignmentHistoryType } from '@definition/schedules';

/**
 * Tracks assignments the user has exported to their own calendar via the
 * "Añadir al calendario" button, so re-exporting after a change can reuse
 * the same iCalendar UID + a bumped SEQUENCE (most calendar apps then update
 * the existing entry in place instead of creating a duplicate), and so the
 * push-diff engine (`@services/push/diff`) can detect when an already
 * exported assignment changes later and warn the user their calendar copy
 * is stale.
 *
 * Local-only (localStorage), same tradeoff already accepted for the push
 * opt-in/seen-assignments snapshot — no cross-device sync.
 */

const KEY = 'organized_calendar-export-tracking';

export type TrackedAssignment = {
  icsUid: string;
  sequence: number;
  contentHash: string;
  exportedAt: string;
  title: string;
};

type TrackingMap = Record<string, TrackedAssignment>;

export const readCalendarExportTracking = (): TrackingMap => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackingMap) : {};
  } catch {
    return {};
  }
};

const writeTracking = (map: TrackingMap) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore storage failures */
  }
};

export const getCalendarExportEntry = (
  id: string
): TrackedAssignment | undefined => readCalendarExportTracking()[id];

export const upsertCalendarExportEntry = (
  id: string,
  entry: TrackedAssignment
) => {
  const map = readCalendarExportTracking();
  map[id] = entry;
  writeTracking(map);
};

export const removeCalendarExportEntry = (id: string) => {
  const map = readCalendarExportTracking();
  if (!(id in map)) return;
  delete map[id];
  writeTracking(map);
};

export const clearCalendarExportTracking = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore storage failures */
  }
};

/**
 * Small dependency-free string hash (djb2) — good enough to detect content
 * changes, not a security primitive. Hashes only the fields that would make
 * an already-exported calendar entry stale if they change.
 */
const djb2 = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

export type AssignmentContentFields = {
  title: string;
  date: string;
  person: string;
  startTime?: string;
  endTime?: string;
};

/**
 * Deliberately narrow: only the fields that make an already-exported
 * calendar entry literally wrong (title/date/time), not richer display-only
 * details (companion names, source material). The push-diff engine
 * (`@services/push/diff`) re-derives assignments directly from Dexie/atoms
 * for its own change check, separately from the richer rows
 * `useAssignments.ts` builds for display — the two can't always compute the
 * exact same `descItems`/companion text, so hashing those would cause false
 * "your assignment changed" pushes right after a fresh export. Every field
 * hashed here IS cheap and identical in both places.
 */
export const computeContentHashFromFields = (
  fields: AssignmentContentFields
): string =>
  djb2(
    JSON.stringify({
      title: fields.title,
      date: fields.date,
      person: fields.person,
      startTime: fields.startTime ?? '',
      endTime: fields.endTime ?? '',
    })
  );

export const computeAssignmentContentHash = (
  history: AssignmentHistoryType
): string =>
  computeContentHashFromFields({
    title: history.assignment.title,
    date: history.actualDate || history.weekOf,
    person: history.assignment.person,
    startTime: history.assignment.startTime,
    endTime: history.assignment.endTime,
  });
