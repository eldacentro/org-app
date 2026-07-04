import { useMemo, useState } from 'react';
import { useCurrentUser } from '@hooks/index';
import { personWasEverPioneer } from '@services/app/persons';
import useMonthlyReport from '@features/ministry/report/publisher_report/monthly_report/useMonthlyReport';
import { InformeViewId } from './view_switcher/index.types';

/**
 * Decide la forma de "Informe de predicación": un publicador normal ve solo
 * el formulario simple (mes actual/anteriores, sin horas); alguien que ha
 * sido precursor alguna vez (auxiliar, regular, misión de campo o especial)
 * ve además las vistas Día/Mes/Año.
 *
 * Se usa `personWasEverPioneer` (ignora si la inscripción ya terminó) y NO
 * `personIsAP`/`personIsFR`/etc. (que solo miran "activo ahora mismo") —
 * si no, alguien que dejó de ser precursor a mitad de año perdería de golpe
 * el acceso a revisar sus meses/año pasados como precursor.
 */
const useInforme = () => {
  const { person } = useCurrentUser();

  const isPioneer = useMemo(() => {
    if (!person) return false;
    return personWasEverPioneer(person);
  }, [person]);

  const [activeView, setActiveView] = useState<InformeViewId>('day');

  // `reportUserSelectedMonthState` (el mes elegido para el informe) solo se
  // inicializa dentro de `useMonthlyReport` — hasta ahora eso bastaba porque
  // `MonthlyReport` siempre estaba montado. Con el selector de vistas, Mes y
  // Día pueden mostrarse sin montar `MonthlyReport`, así que se llama aquí
  // también (mismo hook, mismo cálculo, nada duplicado) para garantizar que
  // el mes ya esté listo sin importar qué vista esté activa.
  const { selectedMonth } = useMonthlyReport();

  return { isPioneer, activeView, setActiveView, selectedMonth };
};

export default useInforme;
