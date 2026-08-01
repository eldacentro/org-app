import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { MESES_ES } from '@utils/nombres_fecha';
import { capitalizarPrimera } from '@utils/common';
import { generateMonthNames } from '@services/i18n/translation';
import { appLangState } from '@states/app';
import MonthAccordion from '@components/period_selector/MonthAccordion';
import { MonthsContainerType } from './index.types';
import MonthCompleteMark from './MonthCompleteMark';
import WeekItem from '../week_item';

/**
 * Los meses del panel de semanas de Reuniones.
 *
 * El acordeón —la raya entre meses, abrir uno cerrando el anterior, el
 * desplegable— es `MonthAccordion`, compartido con Departamentos. Aquí queda
 * solo lo propio: cómo se llama cada mes y qué va a su derecha.
 */

/**
 * Solo el NOMBRE del mes, sin año: el año ya lo dice la pestaña que hay justo
 * encima, y repetirlo en las doce filas es ruido.
 */
const nombreDelMes = (valor: string, appLang: string) => {
  const indice = parseInt(valor.split(/[/-]/)[1], 10) - 1;

  const nombre = capitalizarPrimera(generateMonthNames(appLang)[indice]);

  if (!nombre || nombre === 'undefined') {
    return MESES_ES[indice] || 'Mes';
  }

  return nombre;
};

const MonthsContainer = ({ months, reverse = false }: MonthsContainerType) => {
  const appLang = useAtomValue(appLangState);

  const items = useMemo(() => {
    const enOrden = reverse ? [...months].reverse() : months;

    return enOrden.map((month) => ({
      value: month.value,
      label: nombreDelMes(month.value, appLang),
      trailing: <MonthCompleteMark weeks={month.weeks} />,
      weeks: month.weeks.map((week) => <WeekItem key={week} week={week} />),
    }));
  }, [months, reverse, appLang]);

  return <MonthAccordion months={items} />;
};

export default MonthsContainer;
