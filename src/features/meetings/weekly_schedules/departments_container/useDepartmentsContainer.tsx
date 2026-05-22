import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useIntersectionObserver } from '@hooks/index';
import { deptScheduleState } from '@states/departments_schedule';
import { addMonths, formatDate, getWeekDate } from '@utils/date';
import { JWLangState } from '@states/settings';
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
  const lang = useAtomValue(JWLangState);

  const [value, setValue] = useState<number | boolean>(false);

  const noSchedule = useMemo(() => {
    return schedules.length === 0;
  }, [schedules]);

  const filteredSources = useMemo(() => {
    const minDate = formatDate(addMonths(new Date(), -2), 'yyyy/MM/dd');

    return sources.filter(
      (record) =>
        record.weekOf >= minDate &&
        record.midweek_meeting?.week_date_locale[lang]?.length > 0
    );
  }, [sources, lang]);

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
    currentWeekVisible,
    scheduleLastUpdated,
    noSchedule,
    schedule,
  };
};

export default useDepartmentsContainer;
