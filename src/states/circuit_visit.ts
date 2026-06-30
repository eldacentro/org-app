import { atom } from 'jotai';
import { CircuitVisitType } from '@definition/circuit_visit';
import { formatDate, getWeekDate } from '@utils/date';

// Fuente de la verdad de las visitas del CO (alimentada por liveQuery en
// useIndexedDb). Ya viene filtrada de tombstones (_deleted).
export const circuitVisitsState = atom<CircuitVisitType[]>([]);

// Normaliza cualquier fecha de semana al LUNES (yyyy/MM/dd), igual que el resto
// de la app (schedules/sources). Imprescindible porque el weekOf de una
// asignación puede ser el día real de la reunión (miércoles), no el lunes.
export const normalizeToMonday = (week: string): string => {
  if (!week) return '';
  return formatDate(getWeekDate(new Date(week)), 'yyyy/MM/dd');
};

// Devuelve la visita activa para una semana dada (comparando por lunes), o null.
export const findVisitForWeek = (
  visits: CircuitVisitType[],
  week: string
): CircuitVisitType | null => {
  const target = normalizeToMonday(week);
  if (!target) return null;

  return (
    visits.find(
      (visit) => !visit._deleted && normalizeToMonday(visit.weekOf) === target
    ) ?? null
  );
};
