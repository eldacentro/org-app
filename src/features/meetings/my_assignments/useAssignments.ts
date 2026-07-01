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
import { addWeeks, formatDate, getWeekDate } from '@utils/date';
import { AssignmentHistoryType } from '@definition/schedules';
import { serviceOutingsListState } from '@states/service_outings';
import { circuitVisitsState } from '@states/circuit_visit';
import { personsStateFind } from '@services/states/persons';
import { exhibitorsListState, exhibitorsSettingsState } from '@states/exhibitors';
import { resolveAssignmentDate } from '@utils/assignments';
import { DeptWeekType } from '@definition/departments_schedule';
import { dbLimpiezaGetConfig } from '@services/dexie/limpieza';
import { getMyExhibitorTurns } from '@utils/exhibitors';
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
  const circuitVisits = useAtomValue(circuitVisitsState);
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

          // Un rol de departamento cubre toda la semana en un solo dato (así
          // se organiza y edita en la página de Departamentos, sin cambios).
          // Aquí, de cara al hermano, tiene más sentido verlo como DOS
          // asignaciones separadas: una para el día real de la reunión de
          // entre semana y otra para el de fin de semana — incluyendo el
          // ajuste a martes durante una semana de visita del CO, porque
          // ambas usan schedulesGetMeetingDate (misma fuente que "Programas
          // semanales"). Se omite el día que no tenga reunión esa semana
          // (asamblea, congreso, Memorial, etc.).
          const schedule = schedules.find((s) => s.weekOf === weekDate);

          const meetingDays: Array<'midweek' | 'weekend'> = ['midweek', 'weekend'];

          for (const dept of depts) {
            for (const [role, data] of Object.entries(week[dept])) {
              if (data.value !== uid) continue;

              for (const meeting of meetingDays) {
                const weekType =
                  schedule?.[`${meeting}_meeting`]?.week_type?.find(
                    (r) => r.type === 'main'
                  )?.value ?? Week.NORMAL;

                if (schedulesWeekNoMeeting(weekType)) continue;

                const meetingDateStr = schedulesGetMeetingDate({
                  week: weekDate,
                  meeting,
                  dataView: 'main',
                }).date;
                const actualDate = meetingDateStr || weekDate;

                results.push({
                  id: `DEPT_${weekDate}_${dept}_${role}_${meeting}`,
                  // weekOf = fecha real de la reunión (no el lunes), igual
                  // que resolveAssignmentDate hace para las asignaciones
                  // normales de reunión — así el agrupamiento por mes y por
                  // tarjeta usa el mismo criterio y ambas caen juntas.
                  weekOf: actualDate,
                  weekOfFormatted: formatDate(
                    new Date(actualDate),
                    shortDateFormat
                  ),
                  actualDate,
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

    // Un turno fijo/recurrente (exhibitorsSettings.fixedAssignments) se
    // repite indefinidamente, así que mostrarlo hasta el final del rango
    // visible (hasta 12 meses) abruma y confunde — a diferencia de las demás
    // categorías, que solo muestran lo que un responsable ya creó a mano. Por
    // eso aquí se limita aparte a "el mes corriente + uno más", sin importar
    // el rango elegido para el resto de "Mis asignaciones".
    const getExhibitorsAssignments = (uid: string): AssignmentHistoryType[] => {
      const exhibitorMaxDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      const exhibitorMaxDateStr = formatDate(exhibitorMaxDate, 'yyyy/MM/dd');

      const turns = getMyExhibitorTurns(
        exhibitors,
        exhibitorsSettings,
        uid,
        now,
        currentDayStr,
        exhibitorMaxDateStr
      );

      return turns.map((turn) => {
        const roleTitle = turn.isResponsible ? 'Exhibidores: Responsable de turno' : 'Exhibidores';
        const timeRange = `${turn.startTime}-${turn.endTime}`;
        const descText = `🕒 ${timeRange}  •  📍 ${turn.location}`;

        return {
          id: `${turn.turnId}_${turn.date}`,
          weekOf: turn.weekOf,
          weekOfFormatted: formatDate(new Date(turn.date), shortDateFormat),
          actualDate: turn.date,
          assignment: {
            code: 0 as AssignmentHistoryType['assignment']['code'],
            person: uid,
            key: `EXHIBITOR_${turn.turnId}_${turn.date}` as AssignmentHistoryType['assignment']['key'],
            dataView: 'main',
            title: roleTitle,
            desc: descText,
          },
        };
      });
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

    // Visitas de pastoreo: le aparece al anciano acompañante (NO al hermano visitado).
    // Comidas de la visita del CO: le aparece al anfitrión.
    const getCircuitVisitAssignments = (uid: string): AssignmentHistoryType[] => {
      const results: AssignmentHistoryType[] = [];
      const maxDateStr = formatDate(maxDate, 'yyyy/MM/dd');

      for (const visit of circuitVisits) {
        if (visit._deleted) continue;
        // Comidas: aparece al anfitrión (host = person_uid)
        for (const meal of visit.meals ?? []) {
          if (
            meal.host === uid &&
            meal.date >= currentDayStr &&
            meal.date <= maxDateStr
          ) {
            const hostPerson = personsStateFind(uid);
            const hostName = hostPerson
              ? `${hostPerson.person_data.person_firstname.value} ${hostPerson.person_data.person_lastname.value}`.trim()
              : '';
            results.push({
              id: `COVISIT_MEAL_${visit.id}_${meal.id}`,
              weekOf: visit.weekOf,
              weekOfFormatted: formatDate(new Date(meal.date), shortDateFormat),
              actualDate: meal.date,
              assignment: {
                code: 0 as AssignmentHistoryType['assignment']['code'],
                person: uid,
                key: `COVISIT_MEAL_${meal.id}` as AssignmentHistoryType['assignment']['key'],
                dataView: 'main',
                title: 'Comida con el superintendente',
                desc: hostName ? `🍽️ Anfitrión: ${hostName}` : '🍽️ Visita del superintendente de circuito',
              },
            });
          }
        }
        // Pastoreo: aparece al anciano acompañante
        for (const sv of visit.shepherding_visits ?? []) {
          if (
            sv.elder === uid &&
            sv.date >= currentDayStr &&
            sv.date <= maxDateStr
          ) {
            const brotherPerson = personsStateFind(sv.brother);
            const brotherName = brotherPerson
              ? `${brotherPerson.person_data.person_firstname.value} ${brotherPerson.person_data.person_lastname.value}`.trim()
              : 'hermano';
            results.push({
              id: `COVISIT_SHEPHERD_${visit.id}_${sv.id}`,
              weekOf: visit.weekOf,
              weekOfFormatted: formatDate(new Date(sv.date), shortDateFormat),
              actualDate: sv.date,
              assignment: {
                code: 0 as AssignmentHistoryType['assignment']['code'],
                person: uid,
                key: `COVISIT_SHEPHERD_${sv.id}` as AssignmentHistoryType['assignment']['key'],
                dataView: 'main',
                title: 'Visita de pastoreo (CO)',
                desc: `🕒 ${sv.time || '—'}  •  👤 ${brotherName}`,
              },
            });
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

      const deptAssignments = filterType === 'preaching' || filterType === 'limpieza' ? [] : getDeptAssignments(uid);
      const outingAssignments = filterType === 'meetings' || filterType === 'limpieza' ? [] : getServiceOutingsAssignments(uid);
      const exhibitorAssignments = filterType === 'meetings' || filterType === 'limpieza' ? [] : getExhibitorsAssignments(uid);
      const limpiezaAssign = filterType === 'meetings' || filterType === 'preaching' ? [] : getLimpiezaAssignments(uid);

      const circuitAssignments = getCircuitVisitAssignments(uid);
      return [...meetingAssignments, ...deptAssignments, ...outingAssignments, ...exhibitorAssignments, ...limpiezaAssign, ...circuitAssignments];
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
    circuitVisits,
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
