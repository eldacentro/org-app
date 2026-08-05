import appDb from '@db/appDb';
import {
  ResponsabilidadesType,
  Departamento,
} from '@definition/responsabilidades';
import { store } from '@states/index';
import { fullnameState } from '@states/settings';

const RECORD_ID = 'main';

const triggerSync = () => {
  import('@services/worker/backupWorker').then(({ default: worker }) =>
    worker.postMessage('startWorker')
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

export const dbResponsabilidadesGet =
  async (): Promise<ResponsabilidadesType | null> => {
    const record = await appDb.responsabilidades.get(RECORD_ID);
    return record ?? null;
  };

/**
 * Sella los departamentos que de verdad han cambiado.
 *
 * Aquí se arreglan dos cosas de una vez, y la primera era un fallo: la fecha de
 * un departamento **solo se ponía al crearlo**. Al editarlo después —cambiar el
 * responsable, añadir un miembro— seguía diciendo la fecha del día que se creó,
 * así que el panel de «Última actualización» enseñaba fechas de nacimiento
 * haciéndolas pasar por fechas de cambio.
 *
 * Y de paso queda el autor, que no existía por departamento.
 *
 * Se compara contra lo que hay guardado en vez de sellar todo: sellar los
 * catorce departamentos cada vez que se toca uno haría que el panel dijera «hoy
 * cambió todo», que es exactamente lo que se vino a quitar. Lo que no cambia,
 * conserva su fecha y su autor.
 */
export const sellarLosQueCambian = (
  entrantes: ResponsabilidadesType['departamentos'],
  guardados: ResponsabilidadesType['departamentos'],
  cuando: string,
  quien: string
): ResponsabilidadesType['departamentos'] =>
  entrantes.map((departamento) => {
    const anterior = guardados.find((item) => item.id === departamento.id);

    // Nuevo: se queda con la marca que traiga de quien lo creó.
    if (!anterior) return { ...departamento, updatedAt: cuando, by: quien };

    const comparable = (item: typeof departamento) => {
      const { updatedAt: _f, by: _a, ...resto } = item;
      void _f;
      void _a;

      return JSON.stringify(resto);
    };

    if (comparable(anterior) === comparable(departamento)) {
      return {
        ...departamento,
        updatedAt: anterior.updatedAt,
        by: anterior.by,
      };
    }

    return { ...departamento, updatedAt: cuando, by: quien };
  });

export const dbResponsabilidadesSave = async (
  data: ResponsabilidadesType
): Promise<void> => {
  const fullname = store.get(fullnameState);
  const ahora = new Date().toISOString();

  const guardado = await appDb.responsabilidades.get(RECORD_ID);

  const toSave: ResponsabilidadesType = {
    ...data,
    id: RECORD_ID,
    departamentos: sellarLosQueCambian(
      data.departamentos ?? [],
      guardado?.departamentos ?? [],
      ahora,
      fullname
    ),
    updatedAt: ahora,
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
