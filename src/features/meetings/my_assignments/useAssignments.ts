import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import { isMyAssignmentOpenState } from '@states/app';
import {
  shortDateFormatState,
  userLocalUIDState,
  userMembersDelegateState,
} from '@states/settings';
import { DisplayRange } from './indextypes';
import { localStorageGetItem } from '@utils/common';
import { assignmentsHistoryState } from '@states/schedules';
import { deptScheduleState } from '@states/departments_schedule';
import { addWeeks, formatDate, getWeekDate } from '@utils/date';
import { AssignmentHistoryType } from '@definition/schedules';
import { serviceOutingsListState } from '@states/service_outings';
import { exhibitorsListState, exhibitorsSettingsState } from '@states/exhibitors';
import { resolveAssignmentDate } from '@utils/assignments';
import { DeptWeekType } from '@definition/departments_schedule';
import { getEffectiveTurnsForMonth, isMonthCancelled } from '@utils/exhibitors';
import { personsState } from '@states/persons';

const useMyAssignments = () => {
  const navigate = useNavigate();

  const LOCAL_STORAGE_KEY = 'organized_my-assignments-range';

  const [open, setOpen] = useAtom(isMyAssignmentOpenState);

  const userUID = useAtomValue(userLocalUIDState);
  const delegateMembers = useAtomValue(userMembersDelegateState);
  const assignmentsHistory = useAtomValue(assignmentsHistoryState);
  const deptSchedules = useAtomValue(deptScheduleState);
  const serviceOutings = useAtomValue(serviceOutingsListState);
  const exhibitors = useAtomValue(exhibitorsListState);
  const exhibitorsSettings = useAtomValue(exhibitorsSettingsState);
  const shortDateFormat = useAtomValue(shortDateFormatState);

  const storageValue = localStorageGetItem(LOCAL_STORAGE_KEY);
  const intialValue: DisplayRange = storageValue
    ? +storageValue
    : DisplayRange.MONTHS_12;

  const [displayRange, setDisplayRange] = useState(intialValue);
  const [filterType, setFilterType] = useState<'all' | 'meetings' | 'preaching'>('all');

  // Keep this hook to preserve hook call order (Rules of Hooks)
  useAtomValue(personsState);

  const isSetup = useMemo(() => {
    return userUID.length === 0;
  }, [userUID]);

  const personAssignments = useMemo(() => {
    const now = new Date();
    const currentWeekMonday = getWeekDate(now);
    const today = formatDate(currentWeekMonday, 'yyyy/MM/dd');
    const currentDayStr = formatDate(now, 'yyyy/MM/dd');

    const maxDate = addWeeks(now, displayRange);

    const remapAssignmentsDate = assignmentsHistory.map((record) =>
      resolveAssignmentDate(record, shortDateFormat)
    );

    const getDeptAssignments = (uid: string): AssignmentHistoryType[] => {
      const results: AssignmentHistoryType[] = [];

      for (const week of deptSchedules) {
        if (!week) continue;
        const weekDate = week.weekOf;
        if (
          weekDate >= today &&
          weekDate <= formatDate(maxDate, 'yyyy/MM/dd')
        ) {
          // Check each department and role
          type DeptKey = keyof Omit<DeptWeekType, 'weekOf' | 'updatedAt' | 'lastModifiedBy'>;
          const depts: DeptKey[] = [
            'acomodadores',
            'microfonos',
            'multimedia',
            'plataforma',
          ];

          for (const dept of depts) {
            for (const [role, data] of Object.entries(week[dept])) {
              if (data.value === uid) {
                results.push({
                  id: crypto.randomUUID(),
                  weekOf: weekDate,
                  weekOfFormatted: formatDate(
                    new Date(weekDate),
                    shortDateFormat
                  ),
                  assignment: {
                    code: 0 as AssignmentHistoryType['assignment']['code'],
                    person: uid,
                    key: `DEPT_${dept}_${role}` as AssignmentHistoryType['assignment']['key'],
                    dataView: 'main',
                    title: `${dept.charAt(0).toUpperCase() + dept.slice(1)} (${role})`,
                  },
                });
              }
            }
          }
        }
      }

      return results;
    };

    const getServiceOutingsAssignments = (uid: string): AssignmentHistoryType[] => {
      const results: AssignmentHistoryType[] = [];

      for (const week of serviceOutings) {
        if (!week || !week.outings) continue;
        const weekDate = week.weekOf;

        for (const outing of week.outings) {
          if (
            outing.person === uid &&
            !outing.cancelled &&
            outing.date >= currentDayStr &&
            outing.date <= formatDate(maxDate, 'yyyy/MM/dd')
          ) {
            results.push({
              id: outing.id,
              weekOf: weekDate,
              weekOfFormatted: formatDate(
                new Date(outing.date),
                shortDateFormat
              ),
              actualDate: outing.date,
              assignment: {
                code: 0 as AssignmentHistoryType['assignment']['code'],
                person: uid,
                key: `OUTING_${outing.id}` as AssignmentHistoryType['assignment']['key'],
                dataView: 'main',
                title: 'Salida de predicación',
                desc: `🕒 ${outing.time}  •  📍 ${outing.location || 'Salón del Reino'}`,
              },
            });
          }
        }
      }

      return results;
    };

    const getExhibitorsAssignments = (uid: string): AssignmentHistoryType[] => {
      const results: AssignmentHistoryType[] = [];

      for (const week of exhibitors) {
        if (!week || !week.turns) continue;
        const weekDate = week.weekOf;
        const monthStr = weekDate.substring(0, 7);
        
        if (isMonthCancelled(exhibitorsSettings, monthStr)) continue;
        const effectiveTurns = getEffectiveTurnsForMonth(exhibitorsSettings, monthStr);

        for (const turn of week.turns) {
          if (
            !turn.cancelled &&
            turn.date >= currentDayStr &&
            turn.date <= formatDate(maxDate, 'yyyy/MM/dd')
          ) {
            const myAss = turn.assignments?.find((a) => a.person === uid);
            if (myAss) {
              const roleTitle = myAss.isResponsible ? 'Exhibidores: Responsable de turno' : 'Exhibidores';
              const turnConfig = effectiveTurns.find((t) => t.id === turn.turnId);
              if (!turnConfig) continue; // Ignorar asignaciones de turnos eliminados
              const timeRange = `${turnConfig.startTime}-${turnConfig.endTime}`;
              const descText = `🕒 ${timeRange}  •  📍 ${turn.location}`;

              results.push({
                id: `${turn.turnId}_${turn.date}`,
                weekOf: weekDate,
                weekOfFormatted: formatDate(
                  new Date(turn.date),
                  shortDateFormat
                ),
                actualDate: turn.date,
                assignment: {
                  code: 0 as AssignmentHistoryType['assignment']['code'],
                  person: uid,
                  key: `EXHIBITOR_${turn.turnId}_${turn.date}` as AssignmentHistoryType['assignment']['key'],
                  dataView: 'main',
                  title: roleTitle,
                  desc: descText,
                },
              });
            }
          }
        }
      }

      return results;
    };



    const filterAssignments = (uid: string) => {
      const meetingAssignments =
        filterType === 'preaching'
          ? []
          : remapAssignmentsDate.filter(
              (record) =>
                record.assignment.person === uid &&
                record.weekOf >= currentDayStr &&
                record.weekOf <= formatDate(maxDate, 'yyyy/MM/dd')
            );

      const deptAssignments = filterType === 'preaching' ? [] : getDeptAssignments(uid);
      const outingAssignments = filterType === 'meetings' ? [] : getServiceOutingsAssignments(uid);
      const exhibitorAssignments = filterType === 'meetings' ? [] : getExhibitorsAssignments(uid);

      return [...meetingAssignments, ...deptAssignments, ...outingAssignments, ...exhibitorAssignments];
    };

    const ownAssignments = filterAssignments(userUID);
    const delegateAssignments = delegateMembers.flatMap(filterAssignments);

    const groupAndSortAssignments = (assignments: AssignmentHistoryType[]) => {
      const groupedByMonth = assignments.reduce<
        Record<string, AssignmentHistoryType[]>
      >((acc, obj) => {
        const [year, month] = obj.weekOf.split('/').slice(0, 2);
        const key = `${year}/${month}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(obj);
        return acc;
      }, {});

      return Object.keys(groupedByMonth)
        .sort()
        .map((key) => ({
          month: key,
          children:
            groupedByMonth[key]?.toSorted((a, b) =>
              a.weekOf.localeCompare(b.weekOf)
            ) || [],
        }));
    };

    const sortedOwnAssignments = {
      byDate: groupAndSortAssignments(ownAssignments),
      total: ownAssignments.length,
    };
    const sortedDelegateAssignments = {
      byDate: groupAndSortAssignments(delegateAssignments),
      total: delegateAssignments.length,
    };

    return {
      ownAssignments: sortedOwnAssignments,
      delegateAssignments: sortedDelegateAssignments,
    };
  }, [
    assignmentsHistory,
    deptSchedules,
    serviceOutings,
    exhibitors,
    exhibitorsSettings,
    displayRange,
    userUID,
    delegateMembers,
    shortDateFormat,
    filterType,
  ]);

  const handleClose = () => setOpen(false);

  const handleOpenManageAccess = () => {
    navigate('/manage-access');
    setOpen(false);
  };

  const handleRangeChange = (value: DisplayRange) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, value.toString());

    setDisplayRange(value);
  };

  return {
    handleOpenManageAccess,
    open,
    handleClose,
    isSetup,
    displayRange,
    handleRangeChange,
    personAssignments,
    filterType,
    setFilterType,
  };
};

export default useMyAssignments;
