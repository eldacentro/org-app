import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { buildServiceYearsFor, currentServiceYear } from '@utils/date';
import { serviceYearsWithAttendanceState } from '@states/meeting_attendance';

const useMonthlyHistory = () => {
  const años = useAtomValue(serviceYearsWithAttendanceState);

  const [value, setValue] = useState<number | boolean>(false);

  const serviceYears = useMemo(() => {
    const result = buildServiceYearsFor(años);

    return result;
  }, [años]);

  const months = useMemo(() => {
    if (typeof value === 'boolean') return [];

    const year = serviceYears.at(value).year;

    return serviceYears.find((record) => record.year === year)?.months || [];
  }, [value, serviceYears]);

  const handleTabChange = (value: number) => setValue(value);

  useEffect(() => {
    const currentSY = currentServiceYear();
    const findIndex = serviceYears.findIndex(
      (record) => record.year === currentSY
    );
    setValue(findIndex);
  }, [serviceYears]);

  return { value, handleTabChange, months };
};

export default useMonthlyHistory;
