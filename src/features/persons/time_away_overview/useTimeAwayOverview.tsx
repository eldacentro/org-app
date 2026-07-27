import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { personsActiveState } from '@states/persons';
import { fieldGroupsState } from '@states/field_service_groups';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { formatDate, formatDateShortMonth } from '@utils/date';
import {
  buildTimeAwayEntries,
  TimeAwayEntry,
  TimeAwayStatus,
} from '@services/app/time_away';

export type TimeAwayRow = TimeAwayEntry & {
  name: string;
  /** "Grupo 3", o vacío si no está en ninguno. */
  group: string;
  /** "24 jul - 5 ago", o "desde el 24 jul" si no hay vuelta. */
  dates: string;
  /** "vuelve en 9 días", "empieza mañana"… — el estado en una línea. */
  status_label: string;
};

/**
 * Todas las ausencias de la congregación en una sola lista.
 *
 * Los nombres y los grupos se resuelven aquí (necesitan estado global) y la
 * clasificación en `@services/app/time_away` (puro y con pruebas). El buscador
 * es local: la lista completa cabe de sobra en memoria y así no se toca el
 * estado compartido de búsqueda de personas.
 */
const useTimeAwayOverview = () => {
  const persons = useAtomValue(personsActiveState);
  const groups = useAtomValue(fieldGroupsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [search, setSearch] = useState('');

  const today = useMemo(() => formatDate(new Date(), 'yyyy/MM/dd'), []);

  const groupByPerson = useMemo(() => {
    const result = new Map<string, string>();

    groups.forEach((group, index) => {
      const name = group.group_data.name?.trim() || `Grupo ${index + 1}`;

      for (const member of group.group_data.members ?? []) {
        result.set(member.person_uid, name);
      }
    });

    return result;
  }, [groups]);

  const rows = useMemo(() => {
    const byUid = new Map(persons.map((person) => [person.person_uid, person]));

    const entries = buildTimeAwayEntries(
      persons.map((person) => ({
        person_uid: person.person_uid,
        timeAway: person.person_data.timeAway,
      })),
      today
    );

    return entries.map<TimeAwayRow>((entry) => {
      const person = byUid.get(entry.person_uid);

      const start = formatDateShortMonth(entry.start_date);

      const dates = entry.end_date
        ? `${start} - ${formatDateShortMonth(entry.end_date)}`
        : `desde el ${start}`;

      let status_label = '';

      if (entry.status === 'ongoing') {
        if (entry.days === null) status_label = 'sin fecha de vuelta';
        else if (entry.days === 0) status_label = 'vuelve hoy';
        else if (entry.days === 1) status_label = 'vuelve mañana';
        else status_label = `vuelve en ${entry.days} días`;
      }

      if (entry.status === 'upcoming') {
        if (entry.days === 0) status_label = 'empieza hoy';
        else if (entry.days === 1) status_label = 'empieza mañana';
        else status_label = `empieza en ${entry.days} días`;
      }

      return {
        ...entry,
        name: person
          ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
          : '',
        group: groupByPerson.get(entry.person_uid) ?? '',
        dates,
        status_label,
      };
    });
  }, [persons, today, displayNameEnabled, fullnameOption, groupByPerson]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (query.length === 0) return rows;

    return rows.filter(
      (row) =>
        row.name.toLocaleLowerCase().includes(query) ||
        row.group.toLocaleLowerCase().includes(query) ||
        row.comments.toLocaleLowerCase().includes(query)
    );
  }, [rows, search]);

  const sections = useMemo(() => {
    const of = (status: TimeAwayStatus) =>
      filtered.filter((row) => row.status === status);

    return {
      ongoing: of('ongoing'),
      upcoming: of('upcoming'),
      past: of('past'),
    };
  }, [filtered]);

  // Se cuenta sobre la lista completa, no sobre la filtrada: el resumen de
  // arriba responde "¿cuánta gente falta?", no "¿cuántos coinciden con lo que
  // acabo de escribir?".
  const summary = useMemo(
    () => ({
      away_now: new Set(
        rows.filter((row) => row.status === 'ongoing').map((r) => r.person_uid)
      ).size,
      upcoming: rows.filter((row) => row.status === 'upcoming').length,
      stale: rows.filter((row) => row.openStale).length,
    }),
    [rows]
  );

  return { sections, summary, search, setSearch, hasAny: rows.length > 0 };
};

export default useTimeAwayOverview;
