import BaseDexie from 'dexie';

export interface SnapshotType {
  id?: number;
  timestamp: string;
  type: 'daily' | 'weekly' | 'monthly';
  size: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // The complete backup JSON payload
}

class BackupsDexie extends BaseDexie {
  snapshots!: BaseDexie.Table<SnapshotType, number>;

  constructor() {
    super('organized_backups');
    this.version(1).stores({
      snapshots: '++id, timestamp, type',
    });
  }
}

const backupsDb = new BackupsDexie();
export default backupsDb;
