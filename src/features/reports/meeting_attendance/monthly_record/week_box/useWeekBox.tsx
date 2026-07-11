import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Week } from '@definition/week_type';
import {
  WEEK_TYPE_LANGUAGE_GROUPS,
  WEEK_TYPE_NO_MEETING,
} from '@constants/index';
import { useAppTranslation } from '@hooks/index';
import { formatDate, getWeekDate } from '@utils/date';
import { attendanceWeeksForMonth } from '../../hooks/attendanceWeeks';
import { WeekBoxProps } from './index.types';
import { meetingAttendanceState } from '@states/meeting_attendance';
import {
  AttendanceCongregation,
  WeeklyAttendance,
} from '@definition/meeting_attendance';
import {
  attendanceOnlineRecordState,
  userDataViewState,
} from '@states/settings';
import { meetingAttendancePresentSave } from '@services/app/meeting_attendance';
import { monthShortNamesState } from '@states/app';
import { schedulesState } from '@states/schedules';

const useWeekBox = ({ month, index, type, view }: WeekBoxProps) => {
  const { t } = useAppTranslation();

  const attendances = useAtomValue(meetingAttendanceState);
  const dataView = useAtomValue(userDataViewState);
  const recordOnline = useAtomValue(attendanceOnlineRecordState);
  const months = useAtomValue(monthShortNamesState);
  const schedules = useAtomValue(schedulesState);

  // Semanas del mes por MES NATURAL de la reunión (ver attendanceWeeksForMonth):
  // la posición index-1 identifica la reunión de esta casilla.
  const monthWeeks = useMemo(() => {
    return attendanceWeeksForMonth(month, type, view);
  }, [month, type, view]);

  const schedule = useMemo(() => {
    const weekOf = monthWeeks.at(index - 1)?.weekOf;
    if (!weekOf) return undefined;

    return schedules.find((record) => record.weekOf === weekOf);
  }, [schedules, monthWeeks, index]);

  const presentInitial = useMemo(() => {
    const attendance = attendances.find(
      (record) => record.month_date === month
    );

    if (attendance) {
      const weeklyAttendance = attendance[`week_${index}`] as WeeklyAttendance;

      let currentRecord: AttendanceCongregation;

      if (!view) {
        currentRecord = weeklyAttendance[type].find(
          (record) => record.type === dataView
        );
      }

      if (view) {
        currentRecord = weeklyAttendance[type].find(
          (record) => record.type === view
        );
      }

      const newPresent = currentRecord?.present?.toString() || '';
      return newPresent;
    }

    return '';
  }, [attendances, dataView, index, month, type, view]);

  const onlineInitial = useMemo(() => {
    const attendance = attendances.find(
      (record) => record.month_date === month
    );

    if (attendance) {
      const weeklyAttendance = attendance[`week_${index}`] as WeeklyAttendance;

      let currentRecord: AttendanceCongregation;

      if (!view) {
        currentRecord = weeklyAttendance[type].find(
          (record) => record.type === dataView
        );
      }

      if (view) {
        currentRecord = weeklyAttendance[type].find(
          (record) => record.type === view
        );
      }

      const newOnline = currentRecord?.online?.toString() || '';
      return newOnline;
    }

    return '';
  }, [attendances, dataView, index, month, type, view]);

  const [present, setPresent] = useState(presentInitial);
  const [online, setOnline] = useState(onlineInitial);

  const total = useMemo(() => {
    let cnTotal = 0;

    if (present.length > 0) {
      cnTotal += +present;
    }

    if (online.length > 0) {
      cnTotal += +online;
    }

    return cnTotal;
  }, [present, online]);

  const isMidweek = useMemo(() => {
    const today = new Date().getDay();

    return today > 0 && today < 6;
  }, []);

  const isWeekend = useMemo(() => {
    const today = new Date().getDay();

    return today === 0 || today === 6;
  }, []);

  const isCurrent = useMemo(() => {
    const thisWeek = formatDate(getWeekDate(), 'yyyy/MM/dd');
    const findIndex = monthWeeks.findIndex(
      (record) => record.weekOf === thisWeek
    );

    if (type === 'midweek' && isMidweek) {
      return findIndex === index - 1;
    }

    if (type === 'weekend' && isWeekend) {
      return findIndex === index - 1;
    }
  }, [monthWeeks, index, type, isMidweek, isWeekend]);

  const noMeeting = useMemo(() => {
    let weekType = Week.NORMAL;

    if (!schedule) return false;

    if (type === 'midweek') {
      weekType =
        schedule.midweek_meeting.week_type.find(
          (record) => record.type === (view || dataView)
        )?.value ?? Week.NORMAL;
    }

    if (type === 'weekend') {
      weekType =
        schedule.weekend_meeting.week_type.find(
          (record) => record.type === (view || dataView)
        )?.value ?? Week.NORMAL;
    }

    return (
      WEEK_TYPE_NO_MEETING.includes(weekType) ||
      WEEK_TYPE_LANGUAGE_GROUPS.includes(weekType)
    );
  }, [type, schedule, view, dataView]);

  const box_label = useMemo(() => {
    const meetingDate = monthWeeks.at(index - 1)?.date;
    if (!meetingDate) return '';

    const [, monthValue, date] = meetingDate.split('/').map(Number);

    const dateLabel = t('tr_longDateNoYearLocale', {
      month: months[monthValue - 1],
      date,
    });

    return dateLabel;
  }, [monthWeeks, index, t, months]);

  useEffect(() => setPresent(presentInitial), [presentInitial]);

  useEffect(() => setOnline(onlineInitial), [onlineInitial]);

  const handlePresentChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.match(/\D/)) {
      e.preventDefault();
      return;
    }

    const tmpValue = e.target.value;
    const value = tmpValue === '' ? '' : String(+tmpValue).toString();
    setPresent(value);

    meetingAttendancePresentSave({
      count: value,
      index,
      month,
      type,
      record: 'present',
      dataView: view || dataView,
    });
  };

  const handleOnlineChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.match(/\D/)) {
      e.preventDefault();

      return;
    }

    const tmpValue = e.target.value;
    const value = tmpValue === '' ? '' : String(+tmpValue).toString();
    setOnline(value);

    meetingAttendancePresentSave({
      count: value,
      index,
      month,
      type,
      record: 'online',
      dataView: view || dataView,
    });
  };

  return {
    isCurrent,
    handlePresentChange,
    present,
    recordOnline,
    online,
    handleOnlineChange,
    total,
    isMidweek,
    isWeekend,
    box_label,
    noMeeting,
  };
};

export default useWeekBox;
