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
import { assignmentsHistoryState, schedulesState } from '@states/schedules';
import { deptScheduleState } from '@states/departments_schedule';
import { addDays, addWeeks, formatDate, getWeekDate } from '@utils/date';
import { AssignmentHistoryType } from '@definition/schedules';
import { serviceOutingsListState } from '@states/service_outings';
import { exhibitorsListState, exhibitorsSettingsState } from '@states/exhibitors';
import { resolveAssignmentDate } from '@utils/assignments';
import { DeptWeekType } from '@definition/departments_schedule';
import { dbLimpiezaGetConfig } from '@services/dexie/limpieza';
import { getEffectiveTurnsForMonth, isMonthCancelled } from '@utils/exhibitors';
import { LimpiezaConfig } from '@definition/limpieza';
import { calcularGrupoReunion } from '@services/limpieza/calcularRotacion';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { personsState } from '@states/persons';
import { useEffect } from 'react';
import { schedulesGetMeetingDate, schedulesWeekNoMeeting } from '@services/app/schedules';
import { Week } from '@definition/week_type';

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
  const schedules = useAtomValue(schedulesState);

  const storageValue = localStorageGetItem(LOCAL_STORAGE_KEY);
  const intialValue: DisplayRange = storageValue
    ? +storageValue
    : DisplayRange.MONTHS_12;

  const [displayRange, setDisplayRange] = useState(intialValue);
  const [filterType, setFilterType] = useState<'all' | 'meetings' | 'preaching' | 'limpieza'>('all');
  const [limpiezaConfig, setLimpiezaConfig] = useState<LimpiezaConfig | null>(null);

  const groups = useAtomValue(fieldServiceGroupsState);
  // Keep this hook to preserve hook call order (Rules of Hooks)
  useAtomValue(personsState);

  useEffect(() => {
    dbLimpiezaGetConfig().then(setLimpiezaConfig);
  }, []);

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

    // Antes esto solo recorría turn.assignments ya GUARDADOS explícitamente
    // por semana (week.turns) — pero un turno fijo/recurrente (configurado
    // en exhibitorsSettings.fixedAssignments, p.ej. "todos los martes")
    // nunca se guarda como override hasta que alguien lo edita manualmente.
    // La vista de "Programas semanales > Exhibidores" sí genera esos turnos
    // al vuelo (ver ExhibitorsMeeting.tsx); aquí no, así que un publicador
    // con un turno fijo en un mes futuro nunca lo veía en "Mis asignaciones"
    // aunque sí le saliera correctamente en el programa semanal.
    const getExhibitorsAssignments = (uid: string): AssignmentHistoryType[] => {
      const results: AssignmentHistoryType[] = [];
      if (!exhibitorsSettings) return results;

      const weekdaysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const maxDateStr = formatDate(maxDate, 'yyyy/MM/dd');

      let weekMonday = getWeekDate(new Date(now));

      while (formatDate(weekMonday, 'yyyy/MM/dd') <= maxDateStr) {
        const weekOf = formatDate(weekMonday, 'yyyy/MM/dd');
        const monthStr = weekOf.substring(0, 7);

        if (!isMonthCancelled(exhibitorsSettings, monthStr)) {
          const effectiveTurns = getEffectiveTurnsForMonth(exhibitorsSettings, monthStr);
          const weekRecord = exhibitors.find((w) => w?.weekOf === weekOf);

          for (let i = 0; i < 7; i++) {
            const currentDate = addDays(weekMonday, i);
            const dateStr = formatDate(currentDate, 'yyyy/MM/dd');

            if (dateStr >= currentDayStr && dateStr <= maxDateStr) {
              const dayLabel = weekdaysOrder[i];
              const dayTurns = effectiveTurns.filter((t) => t.days.includes(dayLabel));

              for (const turn of dayTurns) {
                const savedTurn = weekRecord?.turns?.find(
                  (t) => t.turnId === turn.id && t.date === dateStr
                );

                if (savedTurn?.cancelled) continue;

                const finalAssignments =
                  savedTurn?.assignments ||
                  (exhibitorsSettings.fixedAssignments || [])
                    .filter((f) => f.turnId === turn.id && (!f.day || f.day === dayLabel))
                    .map((f) => ({ person: f.personUid, isResponsible: f.isResponsible }));

                const myAss = finalAssignments.find((a) => a.person === uid);
                if (myAss) {
                  const roleTitle = myAss.isResponsible ? 'Exhibidores: Responsable de turno' : 'Exhibidores';
                  const timeRange = `${turn.startTime}-${turn.endTime}`;
                  const location = savedTurn?.location || turn.defaultLocation || 'Exhibidor';
                  const descText = `🕒 ${timeRange}  •  📍 ${location}`;

                  results.push({
                    id: `${turn.id}_${dateStr}`,
                    weekOf,
                    weekOfFormatted: formatDate(new Date(dateStr), shortDateFormat),
                    actualDate: dateStr,
                    assignment: {
                      code: 0 as AssignmentHistoryType['assignment']['code'],
                      person: uid,
                      key: `EXHIBITOR_${turn.id}_${dateStr}` as AssignmentHistoryType['assignment']['key'],
                      dataView: 'main',
                      title: roleTitle,
                      desc: descText,
                    },
                  });
                }
              }
            }
          }
        }

        weekMonday = addWeeks(weekMonday, 1);
      }

      return results;
    };

    const getLimpiezaAssignments = (uid: string): AssignmentHistoryType[] => {
      const results: AssignmentHistoryType[] = [];
      if (!limpiezaConfig) return results;

      // Find user's group using the reliable groups data
      const userGroup = groups.find(g => !g.group_data._deleted && g.group_data.members?.some(m => m.person_uid === uid));
      const userGroupId = userGroup?.group_id;
      if (!userGroupId) return results;

      // Generar semanas y filtrar para mostrar solo los próximos 7 días
      const nowMs = now.getTime();
      const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const sevenDaysFromNowMs = nowMs + 7 * 24 * 60 * 60 * 1000;
      const limpiezaMaxMs = nowMs + 14 * 24 * 60 * 60 * 1000; // Solo buscar hasta 2 semanas adelante
      const maxMs = Math.min(maxDate.getTime(), limpiezaMaxMs);
      let currentOffset = 0;

      while (true) {
        const d = new Date(nowMs);
        d.setDate(d.getDate() + currentOffset * 7);
        if (d.getTime() > maxMs) break;

        const wOf = getWeekDate(d);
        const weekOfStr = formatDate(wOf, 'yyyy/MM/dd');

        const schedule = schedules.find(s => s.weekOf === weekOfStr);

        const midweekType = schedule?.midweek_meeting?.week_type?.find((r) => r.type === 'main')?.value ?? Week.NORMAL;
        if (!schedulesWeekNoMeeting(midweekType)) {
          const meetingDateStr = schedulesGetMeetingDate({ week: weekOfStr, meeting: 'midweek', dataView: 'main' }).date;
          const meetingMs = new Date(meetingDateStr || weekOfStr).getTime();
          
          if (meetingMs >= todayMs && meetingMs <= sevenDaysFromNowMs) {
            const midGroupId = calcularGrupoReunion(limpiezaConfig, weekOfStr, 'midweek', groups, schedules);
            if (midGroupId === userGroupId) {
              results.push({
                id: `LIMPIEZA_${weekOfStr}_midweek`,
                weekOf: weekOfStr,
                weekOfFormatted: formatDate(new Date(weekOfStr), shortDateFormat),
                actualDate: meetingDateStr || weekOfStr,
                assignment: {
                  code: 0 as AssignmentHistoryType['assignment']['code'],
                  person: uid,
                  key: `LIMPIEZA_${weekOfStr}_midweek` as AssignmentHistoryType['assignment']['key'],
                  dataView: 'main',
                  title: 'Limpieza del Salón (Entre semana)',
                  desc: '🧹 Tu grupo tiene el turno de limpieza',
                },
              });
            }
          }
        }

        const weekendType = schedule?.weekend_meeting?.week_type?.find((r) => r.type === 'main')?.value ?? Week.NORMAL;
        if (!schedulesWeekNoMeeting(weekendType)) {
          const meetingDateStr = schedulesGetMeetingDate({ week: weekOfStr, meeting: 'weekend', dataView: 'main' }).date;
          const meetingMs = new Date(meetingDateStr || weekOfStr).getTime();

          if (meetingMs >= todayMs && meetingMs <= sevenDaysFromNowMs) {
            const weekendGroupId = calcularGrupoReunion(limpiezaConfig, weekOfStr, 'weekend', groups, schedules);
            if (weekendGroupId === userGroupId) {
              results.push({
                id: `LIMPIEZA_${weekOfStr}_weekend`,
                weekOf: weekOfStr,
                weekOfFormatted: formatDate(new Date(weekOfStr), shortDateFormat),
                actualDate: meetingDateStr || weekOfStr,
                assignment: {
                  code: 0 as AssignmentHistoryType['assignment']['code'],
                  person: uid,
                  key: `LIMPIEZA_${weekOfStr}_weekend` as AssignmentHistoryType['assignment']['key'],
                  dataView: 'main',
                  title: 'Limpieza del Salón (Fin de semana)',
                  desc: '🧹 Tu grupo tiene el turno de limpieza',
                },
              });
            }
          }
        }
        currentOffset++;
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

      const deptAssignments = filterType === 'preaching' || filterType === 'limpieza' ? [] : getDeptAssignments(uid);
      const outingAssignments = filterType === 'meetings' || filterType === 'limpieza' ? [] : getServiceOutingsAssignments(uid);
      const exhibitorAssignments = filterType === 'meetings' || filterType === 'limpieza' ? [] : getExhibitorsAssignments(uid);
      const limpiezaAssign = filterType === 'meetings' || filterType === 'preaching' ? [] : getLimpiezaAssignments(uid);

      return [...meetingAssignments, ...deptAssignments, ...outingAssignments, ...exhibitorAssignments, ...limpiezaAssign];
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
    limpiezaConfig,
    groups,
    schedules,
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
