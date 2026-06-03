import { Table } from 'dexie';
import { ResponsabilidadesType } from '@definition/responsabilidades';

export type ResponsabilidadesTable = {
  responsabilidades: Table<ResponsabilidadesType>;
};

export const responsabilidadesSchema = {
  responsabilidades: 'id',
};
