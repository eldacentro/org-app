import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { buildServiceYearsFor } from '@utils/date';
import { serviceYearsWithAttendanceState } from '@states/meeting_attendance';

const useYearSelector = () => {
  const años = useAtomValue(serviceYearsWithAttendanceState);

  const serviceYears = useMemo(() => {
    const result = buildServiceYearsFor(años);

    return result;
  }, [años]);

  const tabs = useMemo(() => {
    return serviceYears.map((record) => {
      return {
        label: record.year,
      };
    });
  }, [serviceYears]);

  return { tabs };
};

export default useYearSelector;
