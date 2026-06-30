import { Table } from 'dexie';
import { CircuitVisitType } from '@definition/circuit_visit';

export type CircuitVisitTable = {
  circuit_overseer_visits: Table<CircuitVisitType, string>;
};

export const circuitVisitSchema = {
  circuit_overseer_visits: 'id, weekOf, updatedAt',
};
