import appDb from '@db/appDb';
import { ResponsabilidadesType, Departamento } from '@definition/responsabilidades';
import { store } from '@states/index';
import { fullnameState } from '@states/settings';

const RECORD_ID = 'main';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(
    ({ default: worker }) => worker.postMessage('startWorker')
  );
};

const dbUpdateResponsabilidadesMetadata = async () => {
  const metadata = await appDb.metadata.get(1);
  if (!metadata) return;

  metadata.metadata.responsabilidades = {
    ...metadata.metadata.responsabilidades,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

const initialData = (): ResponsabilidadesType => ({
  id: RECORD_ID,
  // Empty placeholder — must lose to any real synced data. dbRestoreResponsabilidades
  // picks whichever record has the newer updatedAt; if this placeholder used "now",
  // it would always look newer than genuine saved data and the real data would
  // never be restored. A later edit on this device would then push this empty
  // record to the server, wiping the real data on every other device.
  updatedAt: '',
  cuerpoAncianos: [],
  cargosAncianos: [
    { cargo: 'Coordinador', responsable: '' },
    { cargo: 'Secretario', responsable: '' },
    { cargo: 'Superintendente de Servicio', responsable: '' },
    { cargo: 'Superintendente de La Atalaya', responsable: '' },
    {
      cargo: 'Superintendente de Vida y Ministerio Cristianos',
      responsable: '',
    },
  ],
  departamentos: [] as Departamento[],
});

export const dbResponsabilidadesGet = async (): Promise<ResponsabilidadesType | null> => {
  const record = await appDb.responsabilidades.get(RECORD_ID);
  return record ?? null;
};

export const dbResponsabilidadesSave = async (
  data: ResponsabilidadesType
): Promise<void> => {
  const fullname = store.get(fullnameState);

  const toSave: ResponsabilidadesType = {
    ...data,
    id: RECORD_ID,
    updatedAt: new Date().toISOString(),
    lastModifiedBy: fullname,
  };

  await appDb.responsabilidades.put(toSave);
  await dbUpdateResponsabilidadesMetadata();
  triggerSync();
};

export const dbResponsabilidadesInit = async (): Promise<void> => {
  const existing = await appDb.responsabilidades.get(RECORD_ID);
  if (!existing) {
    await appDb.responsabilidades.put(initialData());
  }
};
