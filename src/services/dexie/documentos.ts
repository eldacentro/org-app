import appDb from '@db/appDb';

// Devuelve el fileData base64 si este dispositivo tiene el PDF cacheado localmente
export const dbDocumentosGetLocalFile = async (
  id: string
): Promise<string | undefined> => {
  const archivo = await appDb.documentos_archivos.get(id);
  return archivo?.fileData;
};

// Guarda el PDF en base64 en IndexedDB (solo en el dispositivo que sube el doc)
export const dbDocumentosGuardarArchivo = async (
  id: string,
  fileData: string
): Promise<void> => {
  await appDb.documentos_archivos.put({ id, documentoId: id, fileData });
};

// Limpia la caché local al borrar un documento
export const dbDocumentosDelete = async (id: string): Promise<void> => {
  await appDb.transaction(
    'rw',
    appDb.documentos,
    appDb.documentos_archivos,
    async () => {
      await appDb.documentos.delete(id);
      await appDb.documentos_archivos.delete(id);
    }
  );
};
