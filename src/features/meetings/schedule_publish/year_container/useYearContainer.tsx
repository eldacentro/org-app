import { useMemo } from 'react';
import { ScheduleListType } from '../index.types';

/**
 * El estado de la casilla del año, deducido de sus SEMANAS.
 *
 * Se cuentan semanas y no meses porque el mes ya no es la unidad: con un mes a
 * medias, el año tiene que salir a medias también. Contando meses, un mes con
 * tres semanas de cuatro marcadas contaba como "sin marcar" y el año mentía.
 */
const useYearContainer = (months: ScheduleListType['months']) => {
  const { total, marcadas } = useMemo(() => {
    const weeks = months.flatMap((record) => record.weeks);

    return {
      total: weeks.length,
      marcadas: weeks.filter((week) => week.checked).length,
    };
  }, [months]);

  return {
    checked: total > 0 && marcadas === total,
    indeterminate: marcadas > 0 && marcadas < total,
  };
};

export default useYearContainer;
