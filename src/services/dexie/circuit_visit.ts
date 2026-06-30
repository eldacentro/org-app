import appDb from '@db/appDb';
import { CircuitVisitType } from '@definition/circuit_visit';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(({ default: worker }) =>
    worker.postMessage('startWorker')
  );
};

const dbUpdateCircuitVisitMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.circuit_overseer_visits = {
    ...metadata.metadata.circuit_overseer_visits,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbCircuitVisitGetAll = async (): Promise<CircuitVisitType[]> => {
  return await appDb.circuit_overseer_visits.toArray();
};

export const dbCircuitVisitSave = async (visit: CircuitVisitType) => {
  const record: CircuitVisitType = {
    ...visit,
    updatedAt: new Date().toISOString(),
  };

  await appDb.circuit_overseer_visits.put(record);
  await dbUpdateCircuitVisitMetadata();
  triggerSync();

  return record;
};

// Borrado lógico (tombstone) para que el sync propague la baja a los demás
// dispositivos, igual que el resto de entidades de la app.
export const dbCircuitVisitDelete = async (id: string) => {
  const existing = await appDb.circuit_overseer_visits.get(id);
  if (!existing) return;

  await appDb.circuit_overseer_visits.put({
    ...existing,
    _deleted: true,
    updatedAt: new Date().toISOString(),
  });
  await dbUpdateCircuitVisitMetadata();
  triggerSync();
};
