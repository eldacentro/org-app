import appDb from '@db/appDb';
import { PlanEvacuacion } from '@definition/evacuacion';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(
    ({ default: worker }) => worker.postMessage('startWorker')
  );
};

const dbUpdateEvacuacionConfigMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.evacuacion_config = {
    ...metadata.metadata.evacuacion_config,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbEvacuacionGetConfig = async (): Promise<PlanEvacuacion | undefined> => {
  return await appDb.evacuacion_config.get('1');
};

export const dbEvacuacionSaveConfig = async (config: PlanEvacuacion) => {
  await appDb.evacuacion_config.put(config);
  await dbUpdateEvacuacionConfigMetadata();
  triggerSync();
};
