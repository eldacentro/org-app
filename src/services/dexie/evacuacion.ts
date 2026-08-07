import appDb from '@db/appDb';
import { PlanEvacuacion } from '@definition/evacuacion';
import { migrarPlanEvacuacion } from '@features/evacuacion/data';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(({ default: worker }) =>
    worker.postMessage('startWorker')
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

export const dbEvacuacionGetConfig = async (): Promise<
  PlanEvacuacion | undefined
> => {
  const guardado = await appDb.evacuacion_config.get('1');
  if (!guardado) return undefined;

  // El plan vive aquí desde la primera vez que alguien abre el engranaje, así
  // que cambiar el plan por DEFECTO no le cambia nada a quien ya lo tiene.
  // `migrarPlanEvacuacion` pone al día los textos que se acortaron, y solo los
  // que siguen siendo palabra por palabra los viejos.
  const migrado = migrarPlanEvacuacion(guardado);

  // Devuelve el MISMO objeto cuando no había nada que cambiar, así que esta
  // comparación por identidad evita una escritura —y la sincronización que
  // arrastra— en el 99 % de los arranques.
  if (migrado !== guardado) {
    await dbEvacuacionSaveConfig(migrado);
  }

  return migrado;
};

export const dbEvacuacionSaveConfig = async (config: PlanEvacuacion) => {
  await appDb.evacuacion_config.put(config);
  await dbUpdateEvacuacionConfigMetadata();
  triggerSync();
};
