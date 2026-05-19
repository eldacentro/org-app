import { useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { selectedDeptWeekState } from '@states/departments_schedule';
import {
  formatDate,
  getWeekDate,
  addWeeks,
  formatDateShortMonth,
} from '@utils/date';
import { generateMonthNames } from '@services/i18n/translation';

const useDeptWeekSelector = () => {
  const [selectedWeek, setSelectedWeek] = useAtom(selectedDeptWeekState);

  const yearsList = useMemo(() => {
    const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
    const monthNames = generateMonthNames();
    const result = [];

    for (const year of years) {
      const yearMonths = [];
      for (let month = 0; month < 12; month++) {
        const firstDayOfMonth = new Date(year, month, 1);
        const firstMonday = getWeekDate(firstDayOfMonth);
        const weeks = [];

        let currentMonday = new Date(firstMonday);
        while (
          currentMonday.getFullYear() < year ||
          (currentMonday.getFullYear() === year && currentMonday.getMonth() <= month)
        ) {
          if (
            currentMonday.getFullYear() === year &&
            currentMonday.getMonth() === month
          ) {
            const weekOf = formatDate(currentMonday, 'yyyy/MM/dd');
            const endOfWeek = addWeeks(currentMonday, 1);
            endOfWeek.setDate(endOfWeek.getDate() - 1);

            weeks.push({
              weekOf,
              label: `${formatDateShortMonth(currentMonday)} - ${formatDateShortMonth(endOfWeek)}`,
            });
          }
          currentMonday = addWeeks(currentMonday, 1);
        }

        if (weeks.length > 0) {
          yearMonths.push({
            label: monthNames[month],
            value: `${year}/${String(month + 1).padStart(2, '0')}`,
            weeks,
          });
        }
      }

      if (yearMonths.length > 0) {
        result.push({
          label: year.toString(),
          value: year,
          months: yearMonths,
        });
      }
    }
    return result;
  }, []);

  useEffect(() => {
    if (selectedWeek === '' && yearsList.length > 0) {
      const currentMonday = getWeekDate(new Date());
      const currentWeekOf = formatDate(currentMonday, 'yyyy/MM/dd');
      setSelectedWeek(currentWeekOf);
    }
  }, [selectedWeek, setSelectedWeek, yearsList]);

  const activeTab = useMemo(() => {
    if (selectedWeek === '') return 0;
    const [year] = selectedWeek.split('/');
    const index = yearsList.findIndex((t) => t.label === year);
    return index !== -1 ? index : 0;
  }, [selectedWeek, yearsList]);

  return {
    yearsList,
    selectedWeek,
    setSelectedWeek,
    activeTab,
  };
};

export default useDeptWeekSelector;
