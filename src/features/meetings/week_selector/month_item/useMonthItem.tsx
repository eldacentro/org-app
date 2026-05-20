import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useAtomValue } from 'jotai';
import { MonthItemType } from './index.types';
import { schedulesWeekAssignmentsInfo } from '@services/app/schedules';
import { schedulesState } from '@states/schedules';
import {
  generateMonthNames,
  getTranslation,
} from '@services/i18n/translation';
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

  const monthName = useMemo(() => {
    const mesesEs = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const parts = month.split(/[/-]/);
    const year = parts[0];
    const monthPart = parts[1];
    const monthIndex = parseInt(monthPart, 10) - 1;

    const monthNames = generateMonthNames(appLang);
    let name = monthNames[monthIndex];

    if (!name || name === 'undefined') {
      name = mesesEs[monthIndex] || 'Mes';
    }

    const translated = getTranslation({
      key: 'tr_monthYear',
      language: appLang,
      params: { month: name, year },
    });

    if (!translated || translated.includes('undefined')) {
      return `${name} ${year}`;
    }

    return translated;
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
