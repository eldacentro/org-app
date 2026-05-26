import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { localStorageGetItem } from '@utils/common';
import { WeeklySchedulesType } from './index.types';
import { settingsState, userDataViewState } from '@states/settings';
import MidweekContainer from '@features/meetings/weekly_schedules/midweek_container';
import OutgoingTalks from '@features/meetings/weekly_schedules/outgoing_talks';
import WeekendContainer from '@features/meetings/weekly_schedules/weekend_container';
import DepartmentsContainer from '@features/meetings/weekly_schedules/departments_container';
import ServiceOutingsContainer from '@features/meetings/weekly_schedules/service_outings';
import ExhibitorsWeeklyContainer from '@features/meetings/weekly_schedules/exhibitors';

const LOCALSTORAGE_KEY = 'organized_weekly_schedules';

const useWeeklySchedules = () => {
  const { t } = useAppTranslation();

  const scheduleType = useMemo(() => {
    return localStorageGetItem(LOCALSTORAGE_KEY) as WeeklySchedulesType;
  }, []);

  const { isAppointed } = useCurrentUser();

  const settings = useAtomValue(settingsState);
  const dataView = useAtomValue(userDataViewState);

  const outgoingVisible = useMemo(() => {
    if (isAppointed) return true;

    const weekend = settings.cong_settings.weekend_meeting.find(
      (record) => record.type === dataView
    );

    return weekend.outgoing_talks_schedule_public.value;
  }, [isAppointed, settings, dataView]);

  const tabs = useMemo(() => {
    const result = [
      {
        id: 'midweek',
        label: t('tr_midweekMeeting'),
        Component: <MidweekContainer />,
      },
      {
        id: 'weekend',
        label: t('tr_weekendMeeting'),
        Component: <WeekendContainer />,
      },
    ];

    if (outgoingVisible) {
      result.push({
        id: 'outgoing',
        label: t('tr_outgoingTalks'),
        Component: <OutgoingTalks />,
      });
    }

    result.push({
      id: 'departments',
      label: t('tr_departmentsSchedule', 'Departamentos'),
      Component: <DepartmentsContainer />,
    });

    result.push({
      id: 'service_outings',
      label: t('tr_fieldServiceOutings', 'Salidas de predicación'),
      Component: <ServiceOutingsContainer />,
    });

    result.push({
      id: 'exhibitors',
      label: 'Exhibidores',
      Component: <ExhibitorsWeeklyContainer />,
    });

    return result;
  }, [outgoingVisible, t]);

  const value = useMemo(() => {
    if (!scheduleType) return 0;

    const index = tabs.findIndex((tab) => tab.id === scheduleType);
    return index === -1 ? 0 : index;
  }, [scheduleType, tabs]);

  const handleScheduleChange = (index: number) => {
    const type = tabs[index]?.id as WeeklySchedulesType;

    localStorage.setItem(LOCALSTORAGE_KEY, type ?? 'midweek');
  };

  return { value, handleScheduleChange, tabs };
};

export default useWeeklySchedules;
