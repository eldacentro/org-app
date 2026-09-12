import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { buildServiceYearsFor } from '@utils/date';
import YearDetails from './year_details';
import { serviceYearsWithReportsState } from '@states/field_service_reports';

const useYearsStats = ({
  year,
  onYearChange,
}: {
  year: string;
  onYearChange: (year: string) => void;
}) => {
  const años = useAtomValue(serviceYearsWithReportsState);

  const serviceYears = useMemo(() => {
    const result = buildServiceYearsFor(años);

    return result;
  }, [años]);

  // La pestaña elegida sale del año que guarda la página, no de «hoy»: ese año
  // lo comparte con el saldo de precursores, que está en otra tarjeta. Antes
  // cada una tenía el suyo y elegir 2026 aquí no le llegaba a la otra.
  const value = useMemo(() => {
    const index = serviceYears.findIndex((record) => record.year === year);

    // Un año que ya no está en la lista: el más reciente, en vez de dejar las
    // pestañas sin ninguna elegida.
    return index === -1 ? serviceYears.length - 1 : index;
  }, [serviceYears, year]);

  const handleChange = (index: number) => {
    const elegido = serviceYears[index]?.year;

    if (elegido) onYearChange(elegido);
  };

  const tabs = useMemo(() => {
    return serviceYears.map((record) => {
      return {
        label: record.year,
        Component: <YearDetails year={record.year} />,
      };
    });
  }, [serviceYears]);

  return { tabs, value, handleChange };
};

export default useYearsStats;
