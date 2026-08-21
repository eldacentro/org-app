import { createContext } from 'react';

/**
 * De qué semana y de qué grupo es el programa que se está pintando.
 *
 * Los relojitos de cada parte están repartidos por media docena de componentes y
 * ninguno sabe qué semana está enseñando. Sin esto, empezar a seguir la reunión
 * de esta semana pintaría también la de dentro de tres, o la del grupo de otro
 * idioma, que es un programa distinto con sus propias horas.
 */
export const MeetingRunScopeContext = createContext<{
  week: string;
  dataView: string;
} | null>(null);
