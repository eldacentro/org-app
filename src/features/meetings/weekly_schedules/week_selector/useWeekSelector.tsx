import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { WeeklySchedulesType, WeekSelectorProps } from './index.types';
import { sourcesState } from '@states/sources';
import { localStorageGetItem } from '@utils/common';
import { JWLangState } from '@states/settings';
import { schedulesGetMeetingDate } from '@services/app/schedules';

const LOCALSTORAGE_KEY = 'organized_weekly_schedules';

const useWeekSelector = ({ onChange, value }: WeekSelectorProps) => {
  const scheduleType = (localStorageGetItem(LOCALSTORAGE_KEY) ||
    'midweek') as WeeklySchedulesType;

  const sources = useAtomValue(sourcesState);
  const lang = useAtomValue(JWLangState);

  const [currentTab, setCurrentTab] = useState<number | boolean>(false);

  const weeksList = useMemo(() => {
    const minDate = formatDate(addMonths(new Date(), -2), 'yyyy/MM/dd');

    let list = sources.filter(
      (record) => isMondayDate(record.weekOf) && record.weekOf >= minDate
    );

    if (scheduleType === 'midweek' || scheduleType === 'departments') {
      list = list.filter(
        (record) => record.midweek_meeting?.week_date_locale[lang]?.length > 0
      );
    }

    return list;
  }, [sources, scheduleType, lang]);

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
        meeting: scheduleType === 'departments' ? 'midweek' : scheduleType,
        short: true,
      });

      return {
        label: meetingDate.locale,
        className: defaultValue === index ? 'schedules-current-week' : '',
        Component: <></>,
      };
    });
  }, [defaultValue, scheduleType, weeksList]);

  const handleWeekChange = (value: number) => {
    setCurrentTab(value);
    onChange?.(value);
  };

  useEffect(() => {
    if (value === false) {
      setCurrentTab(defaultValue);
      onChange?.(defaultValue);
    }

    if (value) {
      setCurrentTab(value);
    }
  }, [value, defaultValue, onChange]);

  return { weeksTab, currentTab, handleWeekChange };
};

export default useWeekSelector;
