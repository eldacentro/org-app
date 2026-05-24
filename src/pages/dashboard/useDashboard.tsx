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
import { formatDate, getWeekDate } from '@utils/date';
import { isTest } from '@constants/index';
import { resolveAssignmentDate } from '@utils/assignments';
import { DeptWeekType } from '@definition/departments_schedule';

const useDashboard = () => {
  const setIsMyAssignmentOpen = useSetAtom(isMyAssignmentOpenState);

  const firstName = useAtomValue(firstnameState);
  const isCongNew = useAtomValue(congNewState);
  const userUID = useAtomValue(userLocalUIDState);
  const assignmentsHistory = useAtomValue(assignmentsHistoryState);
  const deptSchedules = useAtomValue(deptScheduleState);
  const serviceOutings = useAtomValue(serviceOutingsListState);
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

    return meetingAssignmentsCount + deptAssignmentsCount + outingAssignmentsCount;
  }, [assignmentsHistory, deptSchedules, serviceOutings, shortDateFormat, userUID]);

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
