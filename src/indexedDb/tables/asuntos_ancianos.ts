import { Table } from 'dexie';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';

export type AsuntosAncianosTable = {
  asuntos_ancianos: Table<AsuntoAncianosType>;
};

export const asuntosAncianosSchema = {
  asuntos_ancianos: 'id',
};
