import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useIntersectionObserver } from '@hooks/index';
import { exhibitorsListState } from '@states/exhibitors';
import { addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { monthShortNamesState } from '@states/app';
import { sourcesState } from '@states/sources';

const useExhibitorsContainer = () => {
  const currentWeekVisible = useIntersectionObserver({
    root: '.schedules-view-week-selector .MuiTabs-scroller',
    selector: '.schedules-current-week',
  });

  const { t } = useAppTranslation();

  const exhibitors = useAtomValue(exhibitorsListState);
  const sources = useAtomValue(sourcesState);
  const monthShortNames = useAtomValue(monthShortNamesState);

  const [value, setValue] = useState<number | boolean>(false);

  const noSchedule = useMemo(() => {
    return exhibitors.length === 0;
  }, [exhibitors]);

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

  const weekRecord = useMemo(() => {
    return exhibitors.find((record) => record.weekOf === week);
  }, [exhibitors, week]);

  const scheduleLastUpdated = useMemo(() => {
    if (!weekRecord || noSchedule || !weekRecord.updatedAt) return;

    const d = new Date(weekRecord.updatedAt);
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
  }, [weekRecord, monthShortNames, t, noSchedule]);

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
    weekRecord,
  };
};

export default useExhibitorsContainer;
