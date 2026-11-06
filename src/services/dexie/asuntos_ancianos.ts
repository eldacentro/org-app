import appDb from '@db/appDb';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';

/**
 * Necesidades de la congregación, del lado del dispositivo.
 *
 * Todo lo que escribe pasa por aquí para que no se olvide ninguna de las dos
 * cosas que hacen que un cambio llegue a los demás: sellar `updatedAt` y marcar
 * la tabla como pendiente de subir. Un `appDb.asuntos_ancianos.put(...)` suelto
 * por ahí se queda en el móvil de quien lo escribió.
 */

const marcarParaSubir = async () => {
  const metadata = await appDb.metadata.get(1);

  if (!metadata) return;

  metadata.metadata.asuntos_ancianos = {
    ...metadata.metadata.asuntos_ancianos,
    send_local: true,
  };

  await appDb.metadata.put(metadata);
};

const despertarSync = () => {
  import('@services/worker/backupWorker').then(({ default: worker }) =>
    worker.postMessage('startWorker')
  );
};

const guardar = async (asunto: AsuntoAncianosType) => {
  await appDb.asuntos_ancianos.put(asunto);
  await marcarParaSubir();

  despertarSync();
};

/** Apunta una necesidad nueva. Devuelve la que ha quedado guardada. */
export const dbAsuntoCrear = async ({
  titulo,
  detalle,
  propuestoPor,
  asignadoA = '',
  fechaPosible = '',
}: {
  titulo: string;
  detalle?: string;
  propuestoPor: string;
  asignadoA?: string;
  fechaPosible?: string;
}) => {
  const ahora = new Date().toISOString();

  const asunto: AsuntoAncianosType = {
    id: crypto.randomUUID(),
    updatedAt: ahora,
    _deleted: false,
    titulo: titulo.trim(),
    detalle: (detalle ?? '').trim(),
    asignadoA,
    fechaPosible,
    tratadoEl: '',
    propuestoPor,
    propuestoEl: ahora,
    tratadoPor: '',
    acuerdo: '',
    urgente: false,
  };

  await guardar(asunto);

  return asunto;
};

/**
 * Cambia lo que se le diga de un asunto.
 *
 * Lee lo guardado y escribe encima solo los campos que llegan: dos ancianos
 * tocando el mismo asunto a la vez se pisan menos, y nunca se pierde un campo
 * por construir el registro desde una copia vieja de la pantalla.
 */
export const dbAsuntoActualizar = async (
  id: string,
  cambios: Partial<Omit<AsuntoAncianosType, 'id' | 'updatedAt'>>
) => {
  const guardado = await appDb.asuntos_ancianos.get(id);

  if (!guardado) return;

  await guardar({
    ...guardado,
    ...cambios,
    id: guardado.id,
    updatedAt: new Date().toISOString(),
  });
};

/** La da por tratada: pasa al archivo. */
export const dbAsuntoTratar = async (id: string) => {
  await dbAsuntoActualizar(id, { tratadoEl: new Date().toISOString() });
};

/** La devuelve a pendientes, por si se dio por tratada sin querer. */
export const dbAsuntoReabrir = async (id: string) => {
  await dbAsuntoActualizar(id, { tratadoEl: '', tratadoPor: '', acuerdo: '' });
};

/**
 * Lo borra de verdad — con LÁPIDA, nunca sacándolo de la tabla.
 *
 * Si se quitara la fila, el siguiente ciclo de sincronización volvería a
 * bajarla del servidor y el asunto reaparecería. La lápida con fecha nueva es
 * lo que hace que el borrado llegue a los demás dispositivos.
 */
export const dbAsuntoBorrar = async (id: string) => {
  await dbAsuntoActualizar(id, { _deleted: true });
};
