import appDb from '@db/appDb';
import { LimpiezaConfig } from '@definition/limpieza';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(
    ({ default: worker }) => worker.postMessage('startWorker')
  );
};

const dbUpdateLimpiezaConfigMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.limpieza_config = {
    ...metadata.metadata.limpieza_config,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

export const dbLimpiezaGetConfig = async (): Promise<LimpiezaConfig | undefined> => {
  return await appDb.limpieza_config.get('1');
};

export const dbLimpiezaSaveConfig = async (config: LimpiezaConfig) => {
  await appDb.limpieza_config.put(config);
  await dbUpdateLimpiezaConfigMetadata();
  triggerSync();
};
