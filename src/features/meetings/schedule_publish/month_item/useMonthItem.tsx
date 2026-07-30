import { useMemo } from 'react';
import { capitalizarPrimera } from '@utils/common';
import { useAtomValue } from 'jotai';
import { monthNamesState } from '@states/app';

const useMonthItem = (month: string) => {
  const monthNames = useAtomValue(monthNamesState);

  const monthName = useMemo(() => {
    const monthIndex = +month.split('/')[1];

    return capitalizarPrimera(monthNames[monthIndex - 1]);
  }, [month, monthNames]);

  return { monthName };
};

export default useMonthItem;
