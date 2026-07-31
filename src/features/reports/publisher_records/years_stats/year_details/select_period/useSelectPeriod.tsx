import { useAtomValue } from 'jotai';
import { buildServiceYearsFor } from '@utils/date';
import { serviceYearsWithReportsState } from '@states/field_service_reports';

const useSelectPeriod = ({ year }: { year: string }) => {
  const años = useAtomValue(serviceYearsWithReportsState);

  const serviceYears = buildServiceYearsFor(años);
  const yearObj = serviceYears.find((y) => y.year === year);
  const months = yearObj ? yearObj.months : [];

  return {
    months,
  };
};

export default useSelectPeriod;
