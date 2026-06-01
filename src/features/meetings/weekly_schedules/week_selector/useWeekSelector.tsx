import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { WeekSelectorProps } from './index.types';
import { sourcesState } from '@states/sources';
import { schedulesGetMeetingDate } from '@services/app/schedules';

const useWeekSelector = ({ onChange, value, customWeeksList }: WeekSelectorProps) => {
  const sources = useAtomValue(sourcesState);

  const [currentTab, setCurrentTab] = useState<number | boolean>(false);

  const weeksList = useMemo(() => {
    if (customWeeksList) return customWeeksList;

    const minDate = formatDate(addMonths(new Date(), -2), 'yyyy/MM/dd');

    return sources.filter(
      (record) => isMondayDate(record.weekOf) && record.weekOf >= minDate
    );
  }, [sources, customWeeksList]);

  const defaultValue = useMemo(() => {
    const now = getWeekDate();
    const weekOf = formatDate(now, 'yyyy/MM/dd');

    const index = weeksList.findIndex((record) => record.weekOf === weekOf);
    return index !== -1 ? index : 0;
  }, [weeksList]);

  const weeksTab = useMemo(() => {
    return weeksList.map((source, index) => {
      const meetingDate = schedulesGetMeetingDate({
        week: source.weekOf,
        meeting: 'weekOf',
        short: true,
      });

      return {
        label: meetingDate.locale,
        className: defaultValue === index ? 'schedules-current-week' : '',
        Component: <></>,
      };
    });
  }, [defaultValue, weeksList]);

  const handleWeekChange = (value: number) => {
    setCurrentTab(value);
    onChange?.(value);
  };

  useEffect(() => {
    if (value === false) {
      setCurrentTab(defaultValue);
      onChange?.(defaultValue);
    } else if (typeof value === 'number') {
      setCurrentTab(value);
    }
  }, [value, defaultValue, onChange]);

  return { weeksTab, currentTab, handleWeekChange };
};

export default useWeekSelector;
