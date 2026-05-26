import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useIntersectionObserver } from '@hooks/index';
import { schedulesState } from '@states/schedules';
import { addDays, addMonths, formatDate, getWeekDate, isMondayDate } from '@utils/date';
import { userDataViewState } from '@states/settings';
import { monthShortNamesState } from '@states/app';
import { sourcesState } from '@states/sources';
import { OutgoingTalkSchedule, OutgoingTalkSchedules } from './index.types';

const useOutgoingTalks = () => {
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

  const talkSchedules = useMemo(() => {
    if (!week || !schedule) return [];

    const outgoingSchedules: OutgoingTalkSchedule[] = [];

    const talkSchedules =
      schedule.weekend_meeting?.outgoing_talks.filter(
        (record) => record.value.length > 0 && !record._deleted
      ) ?? [];

    for (const talkSchedule of talkSchedules) {
      const weekday = talkSchedule.congregation.weekday ?? 6;

      outgoingSchedules.push({
        id: talkSchedule.id,
        weekOf: schedule.weekOf,
        date: formatDate(addDays(schedule.weekOf, weekday), 'yyyy/MM/dd'),
        speaker: talkSchedule.value,
        talk: talkSchedule.public_talk,
        congregation: talkSchedule.congregation.name,
      });
    }

    const result = outgoingSchedules.reduce(
      (acc: OutgoingTalkSchedules[], item) => {
        const dataExist = acc.find((record) => record.date === item.date);

        if (!dataExist) {
          acc.push({
            date: item.date,
            schedules: [item],
          });
        }

        if (dataExist) {
          dataExist.schedules.push(item);
        }

        return acc;
      },
      []
    );

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [schedule, week]);

  const scheduleLastUpdated = useMemo(() => {
    if (!schedule || noSchedule) return;

    const dates: string[] = [];
    const talkSchedules =
      schedule.weekend_meeting?.outgoing_talks.filter(
        (record) => !record._deleted
      ) ?? [];

    for (const talkSchedule of talkSchedules) {
      if (talkSchedule.updatedAt.length > 0) {
        dates.push(talkSchedule.updatedAt);
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
    dataView,
    talkSchedules,
  };
};

export default useOutgoingTalks;
