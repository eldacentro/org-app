import { useEffect, useMemo, useState } from 'react';
import { buildServiceYearsList } from '@utils/date';
import useSharedHook from '../useSharedHook';

const useMonthlyRecord = () => {
  const { meetings } = useSharedHook();

  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');

  const serviceYears = useMemo(() => {
    const result = buildServiceYearsList();

    return result;
  }, []);

  const handleYearChange = (value: string) => {
    setYear(value);

    const month = serviceYears
      .find((record) => record.year === value)
      .months.at(0);

    setMonth(month.value);
  };

  const handleMonthChange = (value: string) => {
    setMonth(value);
  };

  useEffect(() => {
    // mes NATURAL de hoy (no el del lunes de la semana): el 1 de julio debe
    // abrir julio aunque la semana empiece el 29 de junio
    const today = new Date();
    let year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');

    const monthValue = `${year}/${month}`;

    if (+month >= 9) {
      year = String(+year + 1).toString();
    }

    setYear(year);
    setMonth(monthValue);
  }, []);

  return { meetings, year, month, handleYearChange, handleMonthChange };
};

export default useMonthlyRecord;
