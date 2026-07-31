import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { buildServiceYearsFor, currentServiceYear } from '@utils/date';
import YearDetails from './year_details';
import { serviceYearsWithReportsState } from '@states/field_service_reports';

const useYearsStats = () => {
  const años = useAtomValue(serviceYearsWithReportsState);

  const serviceYears = useMemo(() => {
    const result = buildServiceYearsFor(años);

    return result;
  }, [años]);

  const intial_value = useMemo(() => {
    const year = currentServiceYear();

    const findIndex = serviceYears.findIndex((record) => record.year === year);
    return findIndex;
  }, [serviceYears]);

  const tabs = useMemo(() => {
    return serviceYears.map((record) => {
      return {
        label: record.year,
        Component: <YearDetails year={record.year} />,
      };
    });
  }, [serviceYears]);

  return { tabs, intial_value };
};

export default useYearsStats;
