import { useMemo, useState } from 'react';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { localStorageGetItem } from '@utils/common';
import { WeeklySchedulesType } from './index.types';
import MidweekContainer from '@features/meetings/weekly_schedules/midweek_container';
import OutgoingTalks from '@features/meetings/weekly_schedules/outgoing_talks';
import WeekendContainer from '@features/meetings/weekly_schedules/weekend_container';
import DepartmentsContainer from '@features/meetings/weekly_schedules/departments_container';
import ServiceOutingsContainer from '@features/meetings/weekly_schedules/service_outings';
import ExhibitorsWeeklyContainer from '@features/meetings/weekly_schedules/exhibitors';
import CircuitVisitWeek from '@features/meetings/weekly_schedules/circuit_visit';
import useUpcomingCircuitVisit from '@features/circuit_visit/shared/useUpcomingCircuitVisit';

const LOCALSTORAGE_KEY = 'organized_weekly_schedules';

const useWeeklySchedules = () => {
  const { t } = useAppTranslation();

  const [scheduleType, setScheduleType] = useState<WeeklySchedulesType>(() => {
    return (
      (localStorageGetItem(LOCALSTORAGE_KEY) as WeeklySchedulesType) ||
      'midweek'
    );
  });

  const { isElder, isAdmin } = useCurrentUser();

  // La visita solo tiene pestaña mientras haya una programada o en curso; el
  // día después de terminar desaparece sola.
  const upcomingVisit = useUpcomingCircuitVisit();

  const outgoingVisible = useMemo(() => {
    return isElder || isAdmin;
  }, [isElder, isAdmin]);

  const handleGoToTab = (id: string) => {
    localStorage.setItem(LOCALSTORAGE_KEY, id);
    setScheduleType(id as WeeklySchedulesType);
  };

  const tabs = useMemo(() => {
    const result = [
      {
        id: 'midweek',
        label: t('tr_midweekMeeting'),
        Component: (
          <MidweekContainer
            onGoToVisit={
              upcomingVisit ? () => handleGoToTab('circuit_visit') : undefined
            }
          />
        ),
      },
      {
        id: 'weekend',
        label: t('tr_weekendMeeting'),
        Component: (
          <WeekendContainer
            onGoToVisit={
              upcomingVisit ? () => handleGoToTab('circuit_visit') : undefined
            }
          />
        ),
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

    // Delante de las salidas: cuando hay visita, es lo primero que se busca.
    if (upcomingVisit) {
      result.push({
        id: 'circuit_visit',
        label: 'Visita del superintendente',
        Component: <CircuitVisitWeek onGoToTab={handleGoToTab} />,
      });
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outgoingVisible, t, upcomingVisit]);

  const value = useMemo(() => {
    if (!scheduleType) return 0;

    const index = tabs.findIndex((tab) => tab.id === scheduleType);
    return index === -1 ? 0 : index;
  }, [scheduleType, tabs]);

  const handleScheduleChange = (index: number) => {
    const type = (tabs[index]?.id as WeeklySchedulesType) ?? 'midweek';

    localStorage.setItem(LOCALSTORAGE_KEY, type);
    setScheduleType(type);
  };

  return { value, handleScheduleChange, handleGoToTab, tabs };
};

export default useWeeklySchedules;
