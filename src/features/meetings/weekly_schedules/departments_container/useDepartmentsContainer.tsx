import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useIntersectionObserver } from '@hooks/index';
import { deptScheduleState } from '@states/departments_schedule';
import { addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { monthShortNamesState } from '@states/app';
import { sourcesState } from '@states/sources';

const useDepartmentsContainer = () => {
  const currentWeekVisible = useIntersectionObserver({
    root: '.schedules-view-week-selector .MuiTabs-scroller',
    selector: '.schedules-current-week',
  });

  const { t } = useAppTranslation();

  const schedules = useAtomValue(deptScheduleState);
  const sources = useAtomValue(sourcesState);
  const monthShortNames = useAtomValue(monthShortNamesState);

  const [value, setValue] = useState<number | boolean>(false);

  const noSchedule = useMemo(() => {
    return schedules.length === 0;
  }, [schedules]);

  const filteredSources = useMemo(() => {
    const minDate = formatDate(addMonths(new Date(), -2), 'yyyy/MM/dd');

    return sources.filter(
      (record) =>
        isMondayDate(record.weekOf) &&
        record.weekOf >= minDate
    );
  }, [sources]);

  const week = useMemo(() => {
    if (typeof value === 'boolean') return null;

    return filteredSources.at(value)?.weekOf || null;
  }, [value, filteredSources]);

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  const scheduleLastUpdated = useMemo(() => {
    if (!schedule || noSchedule || !schedule.updatedAt) return;

    const d = new Date(schedule.updatedAt);
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
  }, [schedule, monthShortNames, t, noSchedule]);

  const handleGoCurrent = () => {
    const now = getWeekDate();
    const weekOf = formatDate(now, 'yyyy/MM/dd');

    const index = filteredSources.findIndex(
      (record) => record.weekOf === weekOf
    );

    // Array.prototype.at(-1) devuelve el ÚLTIMO elemento, no undefined — si
    // la semana actual todavía no está publicada/sincronizada, findIndex
    // devuelve -1 y sin este guard "ir a la semana actual" saltaba en
    // silencio a la última semana del array en vez de mostrar la actual.
    setValue(index !== -1 ? index : 0);
  };

  const handleValueChange = (value: number) => {
    setValue(value);
  };

  return {
    value,
    handleGoCurrent,
    handleValueChange,
    week,
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    schedule,
  };
};

export default useDepartmentsContainer;
