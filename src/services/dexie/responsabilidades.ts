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
  updatedAt: new Date().toISOString(),
  cuerpoAncianos: [
    'Fermín Amorós',
    'César Amorós',
    'Andrés Rico D.',
    'Rubén Santiago',
    'Carlos Saca M.',
    'Ricardo Zamora',
  ],
  cargosAncianos: [
    { cargo: 'Coordinador', responsable: 'Fermín Amorós' },
    { cargo: 'Secretario', responsable: 'César Amorós' },
    { cargo: 'Superintendente de Servicio', responsable: 'Andrés Rico D.' },
    { cargo: 'Superintendente de La Atalaya', responsable: 'Rubén Santiago' },
    {
      cargo: 'Superintendente de Vida y Ministerio Cristianos',
      responsable: 'Carlos Saca M.',
    },
    { cargo: 'Mantenimiento y Acomodadores', responsable: 'Ricardo Zamora' },
  ],
  departamentos: [
    {
      id: crypto.randomUUID(),
      name: 'Acomodadores',
      type: 'simple',
      responsable: 'Ricardo Zamora',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Multimedia',
      type: 'simple',
      responsable: 'Samuel Lázaro',
      auxiliar: 'Alejandro Amorós',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Publicaciones',
      type: 'simple',
      responsable: 'Pablo Albertos',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Limpieza',
      type: 'simple',
      responsable: 'Francisco Sánchez',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Territorios',
      type: 'simple',
      responsable: 'David Tortosa',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Cuentas',
      type: 'simple',
      responsable: 'Alejandro Amorós',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Tablón de anuncios',
      type: 'simple',
      responsable: 'César Amorós',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Auxiliar del Sup. de Servicio',
      type: 'simple',
      responsable: 'Pablo Albertos',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Ayudante de Vida y Ministerio Cristianos',
      type: 'simple',
      responsable: 'Alejandro Amorós',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Consejero auxiliar',
      type: 'simple',
      responsable: 'Ricardo Zamora',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Repr. Comité Mantenimiento',
      type: 'simple',
      responsable: 'Carlos Saca M.',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Cuenta conjunta',
      type: 'simple',
      responsable: 'Fermín Amorós',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Visitas a enfermos',
      type: 'simple',
      responsable: 'Carlos Saca M.',
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Audio y Vídeo',
      type: 'extended',
      responsable: 'Samuel Lázaro',
      members: [
        'Andrés Rico G.',
        'Pablo Albertos',
        'Francisco Sánchez',
        'Plauxides Máñez',
        'Antonio Merino',
        'Federico Ortega',
        'Henry Atta',
        'Jairo Abad',
        'Marcos Bochenek',
        'Carlos Saca Jr.',
        'José Joaquín Ossa',
        'David Tortosa',
        'Francisco Rosas',
      ],
      updatedAt: new Date().toISOString(),
    },
  ] as Departamento[],
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
