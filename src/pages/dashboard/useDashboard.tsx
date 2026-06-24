import { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  congNewState,
  firstnameState,
  settingsState,
  shortDateFormatState,
  userLocalUIDState,
} from '@states/settings';
import { isMyAssignmentOpenState } from '@states/app';
import { assignmentsHistoryState } from '@states/schedules';
import { deptScheduleState } from '@states/departments_schedule';
import { serviceOutingsListState } from '@states/service_outings';
import { exhibitorsListState } from '@states/exhibitors';
import { formatDate, getWeekDate } from '@utils/date';
import { isTest } from '@constants/index';
import { resolveAssignmentDate } from '@utils/assignments';
import { DeptWeekType } from '@definition/departments_schedule';
import { exhibitorsSettingsState } from '@states/exhibitors';
import { getMyExhibitorTurns } from '@utils/exhibitors';

const useDashboard = () => {
  const setIsMyAssignmentOpen = useSetAtom(isMyAssignmentOpenState);

  const firstName = useAtomValue(firstnameState);
  const isCongNew = useAtomValue(congNewState);
  const userUID = useAtomValue(userLocalUIDState);
  const assignmentsHistory = useAtomValue(assignmentsHistoryState);
  const deptSchedules = useAtomValue(deptScheduleState);
  const serviceOutings = useAtomValue(serviceOutingsListState);
  const exhibitors = useAtomValue(exhibitorsListState);
  const exhibitorsSettings = useAtomValue(exhibitorsSettingsState);
  const shortDateFormat = useAtomValue(shortDateFormatState);
  const settings = useAtomValue(settingsState);

  const isMigrated = useMemo(() => {
    return settings.cong_settings.cong_migrated ?? false;
  }, [settings]);

  const initialSnackValue = useMemo(() => {
    return !isMigrated && isCongNew && !isTest;
  }, [isCongNew, isMigrated]);

  const [newCongSnack, setNewCongSnack] = useState(initialSnackValue);

  const countFutureAssignments = useMemo(() => {
    const now = new Date();
    const currentWeekMonday = getWeekDate(now);
    const today = formatDate(currentWeekMonday, 'yyyy/MM/dd');

    const remapAssignmentsDate = assignmentsHistory.map((record) =>
      resolveAssignmentDate(record, shortDateFormat)
    );

    const meetingAssignmentsCount = remapAssignmentsDate.filter(
      (record) => record.assignment.person === userUID && record.weekOf >= today
    ).length;

    let deptAssignmentsCount = 0;

    for (const week of deptSchedules) {
      if (week.weekOf >= today) {
        const depts: (keyof Omit<DeptWeekType, 'weekOf'>)[] = [
          'acomodadores',
          'microfonos',
          'multimedia',
          'plataforma',
        ];

        for (const dept of depts) {
          for (const data of Object.values(week[dept])) {
            if (data.value === userUID) {
              deptAssignmentsCount++;
            }
          }
        }
      }
    }

    let outingAssignmentsCount = 0;

    for (const week of serviceOutings) {
      if (week.weekOf >= today && week.outings) {
        for (const outing of week.outings) {
          if (outing.person === userUID && !outing.cancelled) {
            outingAssignmentsCount++;
          }
        }
      }
    }

    // Igual que en "Mis asignaciones": contar solo turn.assignments
    // GUARDADOS se quedaba corto, porque un turno fijo/recurrente
    // (exhibitorsSettings.fixedAssignments) nunca se guarda como override
    // hasta que alguien edita esa semana a mano. Se usa la misma función
    // que "Mis asignaciones" (con el mismo límite de 2 meses) para que este
    // número siempre coincida con lo que se ve al abrir el diálogo.
    const exhibitorMaxDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const exhibitorMaxDateStr = formatDate(exhibitorMaxDate, 'yyyy/MM/dd');
    const exhibitorAssignmentsCount = getMyExhibitorTurns(
      exhibitors,
      exhibitorsSettings,
      userUID,
      now,
      today,
      exhibitorMaxDateStr
    ).length;

    return meetingAssignmentsCount + deptAssignmentsCount + outingAssignmentsCount + exhibitorAssignmentsCount;
  }, [assignmentsHistory, deptSchedules, serviceOutings, exhibitors, exhibitorsSettings, shortDateFormat, userUID]);

  const handleCloseNewCongNotice = async () => {
    setNewCongSnack(false);
  };

  const handleOpenMyAssignments = async () => {
    setIsMyAssignmentOpen(true);
  };

  return {
    firstName,
    isCongNew,
    handleCloseNewCongNotice,
    handleOpenMyAssignments,
    countFutureAssignments,
    isMigrated,
    newCongSnack,
  };
};

export default useDashboard;
