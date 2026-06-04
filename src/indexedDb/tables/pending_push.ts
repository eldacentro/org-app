import { Table } from 'dexie';

export type PendingPushRecord = {
  id?: number;
  title: string;
  body: string;
  tag: string;
  url: string;
  createdAt: string;
  // stored as 0/1 so Dexie can index it
  shown: 0 | 1;
};

export type PendingPushTable = {
  pending_push: Table<PendingPushRecord, number>;
};

export const pendingPushSchema = {
  pending_push: '++id, shown, createdAt',
};
