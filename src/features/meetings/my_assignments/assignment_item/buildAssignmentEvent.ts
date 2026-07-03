import { DateArray, EventAttributes } from 'ics';
import { AssignmentHistoryType } from '@definition/schedules';
import {
  computeAssignmentContentHash,
  getCalendarExportEntry,
} from '@services/calendar_export/tracking';

/**
 * Pure builder shared by the single-assignment export
 * (`useAddAssignmentToCalendar`) and the "Añadir todo al calendario" bulk
 * export (`useAddAllAssignmentsToCalendar`) — same UID/SEQUENCE/timed-vs-
 * all-day rules in both places, so exporting one assignment individually and
 * exporting it again as part of "todo" always produce the identical event.
 *
 * Only builds a timed event when the assignment type genuinely carries a
 * specific clock time (`assignment.startTime` — service outings, exhibitors,
 * CO shepherding visits). Everything else becomes an all-day event —
 * inventing a time we don't actually know would recreate the exact "trust a
 * wrong calendar entry" problem this feature exists to avoid.
 */

const DEFAULT_DURATION_HOURS: Record<string, number> = {
  OUTING_: 2,
  COVISIT_SHEPHERD_: 1,
};

const TIMED_ALARM_TRIGGER = { hours: 1, before: true } as const;
// Para eventos de todo el día, 6h antes de la medianoche = la tarde anterior
// (18:00 del día antes) — un recordatorio razonable sin inventar una hora.
const ALL_DAY_ALARM_TRIGGER = { hours: 6, before: true } as const;

const parseDateArray = (dateStr: string, timeStr?: string): DateArray => {
  const [y, m, d] = dateStr.split('/').map(Number);

  if (timeStr) {
    const [h, min] = timeStr.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(min)) {
      return [y, m, d, h, min];
    }
  }

  return [y, m, d];
};

const addHours = (arr: DateArray, hours: number): DateArray => {
  if (arr.length === 3) {
    // All-day: end date for a single all-day VEVENT is exclusive (the next day).
    const d = new Date(arr[0], arr[1] - 1, arr[2] + 1);
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  }

  const [y, m, d, h, min] = arr;
  const date = new Date(y, m - 1, d, h, min + hours * 60);
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
};

const buildDescription = (
  history: AssignmentHistoryType,
  personGetName: (uid: string) => string,
  userUID: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  const lines: string[] = [];

  if (userUID !== history.assignment.person) {
    lines.push(t('tr_deliveredBy', { name: personGetName(history.assignment.person) }));
  }

  if (history.assignment.ayf?.student) {
    lines.push(`${t('tr_student')}: ${personGetName(history.assignment.ayf.student)}`);
  }

  if (history.assignment.ayf?.assistant) {
    lines.push(`${t('tr_assistant')}: ${personGetName(history.assignment.ayf.assistant)}`);
  }

  if (history.assignment.src) lines.push(history.assignment.src);
  if (history.assignment.desc) lines.push(history.assignment.desc);

  for (const item of history.assignment.descItems ?? []) {
    lines.push(item.text);
  }

  return lines.join('\n');
};

export type BuildEventContext = {
  personGetName: (uid: string) => string;
  userUID: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
};

export type BuiltAssignmentEvent = {
  eventDetails: EventAttributes;
  icsUid: string;
  sequence: number;
  contentHash: string;
};

export const buildAssignmentEvent = (
  history: AssignmentHistoryType,
  context: BuildEventContext
): BuiltAssignmentEvent => {
  const dateStr = history.actualDate || history.weekOf;
  const keyPrefix = Object.keys(DEFAULT_DURATION_HOURS).find((prefix) =>
    (history.assignment.key ?? '').startsWith(prefix)
  );

  const hasStartTime = Boolean(history.assignment.startTime);

  const start = hasStartTime
    ? parseDateArray(dateStr, history.assignment.startTime)
    : parseDateArray(dateStr);

  const end = hasStartTime
    ? history.assignment.endTime
      ? parseDateArray(dateStr, history.assignment.endTime)
      : addHours(start, keyPrefix ? DEFAULT_DURATION_HOURS[keyPrefix] : 1)
    : addHours(start, 24); // ignorado por addHours para todo-el-día: siempre exclusivo +1 día

  const entry = getCalendarExportEntry(history.id);
  const icsUid = entry?.icsUid ?? `${history.id}@eldacentro.calendar`;
  const contentHash = computeAssignmentContentHash(history);
  const sequence =
    entry && entry.contentHash === contentHash ? entry.sequence : (entry?.sequence ?? -1) + 1;

  const eventDetails: EventAttributes = {
    title: history.assignment.title,
    description: buildDescription(history, context.personGetName, context.userUID, context.t),
    start,
    end,
    uid: icsUid,
    sequence,
    alarms: [
      {
        action: 'display',
        description: history.assignment.title,
        trigger: hasStartTime ? TIMED_ALARM_TRIGGER : ALL_DAY_ALARM_TRIGGER,
      },
    ],
  };

  return { eventDetails, icsUid, sequence, contentHash };
};
