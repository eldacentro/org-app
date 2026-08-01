import { useMemo } from 'react';
import { useBreakpoints } from '@hooks/index';
import MonthAccordion from '@components/period_selector/MonthAccordion';
import DeptWeekItem from './DeptWeekItem';

/**
 * Los meses del panel de semanas de Departamentos.
 *
 * El acordeón es `MonthAccordion`, el mismo que usa el panel de Reuniones.
 * Aquí solo se dice qué filas de semana van dentro.
 */
const DeptMonthsContainer = ({
  months,
}: {
  months: {
    label: string;
    value: string;
    weeks: { weekOf: string; label: string; noMeeting: boolean }[];
  }[];
}) => {
  const { tablet688Up } = useBreakpoints();

  const items = useMemo(
    () =>
      months.map((month) => ({
        value: month.value,
        label: month.label,
        weeks: month.weeks.map((week) => (
          <DeptWeekItem
            key={week.weekOf}
            weekOf={week.weekOf}
            label={week.label}
            noMeeting={week.noMeeting}
          />
        )),
      })),
    [months]
  );

  return (
    // En pantalla estrecha, elegir semana cierra el mes: al volver a abrir el
    // panel no te encuentras la lista larga desplegada por donde la dejaste.
    // En tableta y escritorio el mes se queda abierto, que es donde se
    // agradece poder saltar de una semana a otra sin volver a desplegar.
    <MonthAccordion
      months={items}
      onWeekPicked={tablet688Up ? undefined : () => {}}
    />
  );
};

export default DeptMonthsContainer;
