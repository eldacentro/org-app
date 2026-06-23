import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useIntersectionObserver } from '@hooks/index';
import { schedulesState } from '@states/schedules';
import {
  addMonths,
  addWeeks,
  formatDate,
  getWeekDate,
  isMondayDate,
} from '@utils/date';
import { userDataViewState } from '@states/settings';
import { ASSIGNMENT_PATH } from '@constants/index';
import { schedulesGetData } from '@services/app/schedules';
import { dbSchedCheck } from '@services/dexie/schedules';
import { AssignmentCongregation } from '@definition/schedules';
import { monthShortNamesState } from '@states/app';
import { sourcesState } from '@states/sources';

const useWeekendContainer = () => {
  const currentWeekVisible = useIntersectionObserver({
    root: '.schedules-view-week-selector .MuiTabs-scroller',
    selector: '.schedules-current-week',
  });

  const { t } = useAppTranslation();

  const schedules = useAtomValue(schedulesState);
  const sources = useAtomValue(sourcesState);
  const dataView = useAtomValue(userDataViewState);
  const monthShortNames = useAtomValue(monthShortNamesState);

  const [value, setValue] = useState<number | boolean>(false);

  const noSchedule = useMemo(() => {
    if (schedules.length === 0) return true;

    let noMeeting = true;

    for (const schedule of schedules) {
      if (schedule.weekend_meeting) {
        noMeeting = false;
        break;
      }
    }

    return noMeeting;
  }, [schedules]);

  // El discursante y el discurso se programan con mucha antelación (a veces
  // de un año para otro), bastante antes de que JW.org publique el material
  // de esa semana (tema de Atalaya, canciones). Antes, el selector solo
  // mostraba semanas que YA tenían ese material (filtrando `sources`), así
  // que no se podía ni entrar a una semana futura para dejar puesto el
  // discurso. Por eso, además de las semanas con material real, se añaden
  // semanas futuras generadas por fecha — hasta 12 meses por delante de hoy
  // (deslizante, no salta a un año entero de golpe) — y cuando el material
  // sí llegue después (vía sync de JW.org o import de .epub), se completa
  // solo encima sin tocar lo que ya se haya asignado (son tablas
  // independientes, ver dbSchedCheck/sourcesFormatAndSaveData).
  const weeksRange = useMemo(() => {
    const minDate = formatDate(addMonths(new Date(), -2), 'yyyy/MM/dd');
    const horizon = addMonths(new Date(), 12);

    const generated: { weekOf: string }[] = [];
    let cursor = getWeekDate(new Date());

    while (cursor <= horizon) {
      generated.push({ weekOf: formatDate(cursor, 'yyyy/MM/dd') });
      cursor = addWeeks(cursor, 1);
    }

    const existingSources = sources
      .filter((record) => isMondayDate(record.weekOf) && record.weekOf >= minDate)
      .map((record) => ({ weekOf: record.weekOf }));

    const allWeekOfs = new Set([
      ...existingSources.map((record) => record.weekOf),
      ...generated.map((record) => record.weekOf),
    ]);

    return [...allWeekOfs].sort().map((weekOf) => ({ weekOf }));
  }, [sources]);

  const week = useMemo(() => {
    if (typeof value === 'boolean') return null;

    return weeksRange.at(value)?.weekOf || null;
  }, [value, weeksRange]);

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  // Sin esto, una semana futura sin material todavía no tiene fila en
  // `sched`, y en cuanto alguien intente asignar el discurso/discursante
  // ahí, el guardado fallaría (no hay nada que actualizar). Se crea vacía
  // por adelantado, en el momento en que se entra a la semana.
  useEffect(() => {
    if (!week || schedule) return;

    dbSchedCheck(week);
  }, [week, schedule]);

  const scheduleLastUpdated = useMemo(() => {
    if (!schedule || noSchedule) return;

    const assignments = Object.entries(ASSIGNMENT_PATH);
    const weekendAssignments = assignments.filter(
      (record) =>
        record[0].includes('WM_') && record[0] !== 'WM_CircuitOverseer'
    );

    const dates: string[] = [];
    for (const [, path] of weekendAssignments) {
      const assigned = schedulesGetData(
        schedule,
        path,
        dataView
      ) as AssignmentCongregation;

      if (assigned?.updatedAt.length > 0) {
        dates.push(assigned.updatedAt);
      }
    }

    const recentDate = dates.sort((a, b) => b.localeCompare(a)).at(0);
    if (!recentDate) return;

    const d = new Date(recentDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = d.getDate();
    const monthName = monthShortNames[month];

    const dateFormatted = t('tr_longDateWithYearLocale', {
      year,
      month: monthName,
      date,
    });

    return dateFormatted;
  }, [schedule, dataView, monthShortNames, t, noSchedule]);

  const handleGoCurrent = () => {
    const now = getWeekDate();
    const weekOf = formatDate(now, 'yyyy/MM/dd');

    const index = weeksRange.findIndex((record) => record.weekOf === weekOf);

    setValue(index);
  };

  const handleValueChange = (value: number) => {
    setValue(value);
  };

  return {
    value,
    handleGoCurrent,
    handleValueChange,
    week,
    weeksRange,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    dataView,
  };
};

export default useWeekendContainer;
