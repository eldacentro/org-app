import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { localStorageGetItem } from '@utils/common';
import { weekendMeetingOutgoingTalksPublicState } from '@states/settings';
import { WeeklySchedulesType } from './index.types';
import MidweekContainer from '@features/meetings/weekly_schedules/midweek_container';
import OutgoingTalks from '@features/meetings/weekly_schedules/outgoing_talks';
import WeekendContainer from '@features/meetings/weekly_schedules/weekend_container';
import DepartmentsContainer from '@features/meetings/weekly_schedules/departments_container';
import ServiceOutingsContainer from '@features/meetings/weekly_schedules/service_outings';
import ExhibitorsWeeklyContainer from '@features/meetings/weekly_schedules/exhibitors';
import CircuitVisitWeek from '@features/meetings/weekly_schedules/circuit_visit';
import useCircuitVisitForBrothers from '@features/circuit_visit/shared/useCircuitVisitForBrothers';
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

  // La pestaña de la visita: desde dos meses antes de que empiece y hasta el
  // día después de terminar, cuando desaparece sola. Antes salía en cuanto
  // alguien programaba la visita, así que podía estar ahí un año entero.
  //
  // Los ancianos SÍ la ven desde el momento en que se programa: son quienes la
  // preparan, y les hace falta poder comprobar cómo va a quedar la semana
  // —cómo se mueve la reunión de entre semana, qué partes cambian— mucho antes
  // de que llegue. La ventana de dos meses es para el resto.
  const visitaCompleta = useUpcomingCircuitVisit();
  const visitaParaHermanos = useCircuitVisitForBrothers();

  const upcomingVisit = isElder || isAdmin ? visitaCompleta : visitaParaHermanos;

  const outgoingTalksPublic = useAtomValue(
    weekendMeetingOutgoingTalksPublicState
  );

  // "Mostrar programa de oradores salientes a todos los usuarios" ya decide si
  // los salientes viajan en el programa publicado; aquí faltaba mirarlo, así
  // que el interruptor mandaba el dato a todo el mundo y luego escondía la
  // pestaña a todo el que no fuera anciano.
  const outgoingVisible = useMemo(() => {
    return isElder || isAdmin || outgoingTalksPublic;
  }, [isElder, isAdmin, outgoingTalksPublic]);

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
