import { useMemo } from 'react';
import { personIsEnrollmentActive } from '@services/app/persons';
import { apEnrollmentHours } from '@services/app/ap_enrollment';
import { PersonType } from '@definition/person';

/**
 * Meta de horas mensual de precursor (auxiliar o regular) para un mes concreto
 * — 50 h el regular, y el auxiliar 30, o 15 solo si pidió las 15 y se las
 * aprobaron ese mes. `undefined` si la persona no es precursora ese mes.
 *
 * ESTO SALÍA MAL (2026-09-28). La meta se sacaba de los «meses de 15 horas» de
 * la congregación: si el mes estaba marcado, 15 para TODO el que fuera
 * precursor auxiliar. Pero esa configuración dice qué meses lo permiten, no
 * quién lo pidió — así que a un precursor auxiliar continuo, que siempre es de
 * 30, le aparecían 15 en el informe. Ahora la meta sale de la inscripción de la
 * persona, que es donde la aprobación deja lo que de verdad se le aprobó.
 *
 * Función pura (sin hooks) para que se pueda llamar en bucle por mes, p. ej.
 * desde `yearly_chart/useYearlyChart.tsx`, sin duplicar esta regla de
 * negocio una segunda vez.
 */
export const computeMonthlyGoal = (
  person: PersonType | undefined,
  month: string
) => {
  if (!person) return undefined;

  let value: number | undefined;

  const isAP = personIsEnrollmentActive(person, 'AP', month);
  const isFR = personIsEnrollmentActive(person, 'FR', month);

  if (isAP) {
    value = apEnrollmentHours(person, month) ?? 30;
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
  const goal = useMemo(() => {
    return computeMonthlyGoal(person, month);
  }, [person, month]);

  return goal;
};

export default useMonthlyGoal;
