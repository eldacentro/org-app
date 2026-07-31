import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import { schedulesState, selectedWeekState } from '@states/schedules';
import {
  schedulesGetMeetingDate,
  schedulesWeekAssignmentsInfo,
} from '@services/app/schedules';
import {
  userDataViewState,
  weekendMeetingOpeningPrayerAutoAssignState,
} from '@states/settings';
import { Week } from '@definition/week_type';

const useWeekItem = (week: string) => {
  const location = useLocation();

  const [selectedWeek, setSelectedWeek] = useAtom(selectedWeekState);

  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const prayerAutoAssign = useAtomValue(
    weekendMeetingOpeningPrayerAutoAssignState
  );

  const schedule = useMemo(() => {
    return schedules.find((record) => record.weekOf === week);
  }, [schedules, week]);

  const meeting = useMemo(() => {
    return location.pathname === '/midweek-meeting' ? 'midweek' : 'weekend';
  }, [location.pathname]);

  const isSelected = useMemo(() => {
    return week === selectedWeek;
  }, [week, selectedWeek]);

  const weekType = useMemo(() => {
    if (!schedule) return Week.NORMAL;

    return (
      schedule.midweek_meeting.week_type.find(
        (record) => record.type === dataView
      )?.value ?? Week.NORMAL
    );
  }, [schedule, dataView]);

  const weekDateLocale = useMemo(() => {
    // Corta ("3 Dic"), como los otros dos selectores de semana de la app.
    // Salía "3 diciembre" mientras Departamentos y Oradores salientes decían
    // "5 Ene" y "28 Dic". Se sigue enseñando la fecha de la REUNIÓN, que es el
    // dato útil aquí, no el lunes de la semana.
    const meetingDate = schedulesGetMeetingDate({ week, meeting, short: true });

    return meetingDate.locale;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, meeting, weekType]);

  const { assigned, total } = useMemo(() => {
    const values = { assigned: 0, total: 0 };

    if (!schedule) return values;

    const data = schedulesWeekAssignmentsInfo(schedule.weekOf, meeting);

    values.assigned = data.assigned;
    values.total = data.total;

    return values;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, meeting, prayerAutoAssign]);

  const handleSelectWeek = (value: string) => setSelectedWeek(value);

  return { weekDateLocale, handleSelectWeek, isSelected, total, assigned };
};

export default useWeekItem;
