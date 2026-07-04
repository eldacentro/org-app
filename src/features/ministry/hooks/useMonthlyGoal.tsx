import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { congSpecialMonthsState } from '@states/settings';
import { personIsEnrollmentActive } from '@services/app/persons';
import { PersonType } from '@definition/person';
import { SpecialMonthType } from '@definition/settings';

/**
 * Meta de horas mensual de precursor (auxiliar o regular) para un mes
 * concreto — 30h (o 15h en un mes especial designado por la congregación)
 * para AP, 50h para FR. `undefined` si la persona no es precursora ese mes.
 *
 * Función pura (sin hooks) para que se pueda llamar en bucle por mes, p. ej.
 * desde `yearly_chart/useYearlyChart.tsx`, sin duplicar esta regla de
 * negocio una segunda vez.
 */
export const computeMonthlyGoal = (
  person: PersonType | undefined,
  month: string,
  specialMonths: SpecialMonthType[]
) => {
  if (!person) return undefined;

  let value: number | undefined;

  const isAP = personIsEnrollmentActive(person, 'AP', month);
  const isFR = personIsEnrollmentActive(person, 'FR', month);

  if (isAP) {
    const isSpecial = specialMonths.find((record) => record.months.includes(month));
    value = isSpecial ? 15 : 30;
  }

  if (isFR) {
    value = 50;
  }

  return value;
};

/**
 * Extraído de `form_S4/hours_fields/useHoursFields.tsx` para que la nueva
 * página "Informe de predicación" (vistas Día/Mes) pueda mostrar la misma
 * meta sin duplicar esta lógica una tercera vez.
 */
const useMonthlyGoal = (person: PersonType | undefined, month: string) => {
  const specialMonths = useAtomValue(congSpecialMonthsState);

  const goal = useMemo(() => {
    return computeMonthlyGoal(person, month, specialMonths);
  }, [person, month, specialMonths]);

  return goal;
};

export default useMonthlyGoal;
