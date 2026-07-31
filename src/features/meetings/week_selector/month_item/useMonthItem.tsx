import { useEffect, useMemo, useState } from 'react';
import { MESES_ES } from '@utils/nombres_fecha';
import { capitalizarPrimera } from '@utils/common';
import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { MonthItemType } from './index.types';
import { schedulesWeekAssignmentsInfo } from '@services/app/schedules';
import { schedulesState } from '@states/schedules';
import { generateMonthNames } from '@services/i18n/translation';
import { appLangState } from '@states/app';

const useMonthItem = ({
  month,
  weeks,
  currentExpanded,
  onChangeCurrentExpanded,
}: MonthItemType) => {
  const appLang = useAtomValue(appLangState);

  const location = useLocation();
  const schedules = useAtomValue(schedulesState);

  const [total, setTotal] = useState(0);
  const [assigned, setAssigned] = useState(0);

  const meeting = useMemo(() => {
    return location.pathname === '/midweek-meeting' ? 'midweek' : 'weekend';
  }, [location.pathname]);

  const expanded = useMemo(() => {
    return currentExpanded === month.toString();
  }, [currentExpanded, month]);

  // Solo el NOMBRE del mes, sin año: el año ya lo dice la pestaña que hay
  // justo encima, y repetirlo en las doce filas es ruido. Antes salía "Enero
  // 2026" aquí y "Enero" en Departamentos — el mismo control, dos textos.
  const monthName = useMemo(() => {
    const parts = month.split(/[/-]/);
    const monthIndex = parseInt(parts[1], 10) - 1;

    const monthNames = generateMonthNames(appLang);
    const name = capitalizarPrimera(monthNames[monthIndex]);

    if (!name || name === 'undefined') {
      return MESES_ES[monthIndex] || 'Mes';
    }

    return name;
  }, [appLang, month]);

  const assignComplete = useMemo(() => {
    return total === 0 ? false : assigned === total;
  }, [total, assigned]);

  const counts = useMemo(() => {
    let total = 0;
    let assigned = 0;

    for (const week of weeks) {
      const schedule = schedules.find((record) => record.weekOf === week);

      if (!schedule) {
        continue;
      }

      const data = schedulesWeekAssignmentsInfo(schedule.weekOf, meeting);

      total += data.total;
      assigned += data.assigned;
    }

    return { total, assigned };
  }, [weeks, schedules, meeting]);

  const handleToggleExpand = () => {
    if (currentExpanded === month) {
      onChangeCurrentExpanded('');
    } else {
      onChangeCurrentExpanded(month);
    }
  };

  useEffect(() => {
    setTotal(counts.total);
    setAssigned(counts.assigned);
  }, [counts]);

  return { monthName, expanded, handleToggleExpand, assignComplete };
};

export default useMonthItem;
