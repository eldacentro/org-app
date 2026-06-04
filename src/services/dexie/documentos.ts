import appDb from '@db/appDb';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';

export const dbDocumentosGetAll = async (): Promise<DocumentoArchivo[]> => {
  return await appDb.documentos.toArray();
};

export const dbDocumentosGetById = async (id: string): Promise<DocumentoArchivo | undefined> => {
  const doc = await appDb.documentos.get(id);
  if (!doc) return undefined;
  
  const archivo = await appDb.documentos_archivos.get(id);
  if (archivo) {
    doc.fileData = archivo.fileData;
  }
  return doc;
};

export const dbDocumentosGetCategorias = async (): Promise<DocumentoCategoria[]> => {
  return await appDb.documento_categorias.orderBy('orden').toArray();
};

export const dbDocumentosSave = async (doc: DocumentoArchivo): Promise<void> => {
  const docToSave = { ...doc };
  delete docToSave.fileData;
  await appDb.documentos.put(docToSave);
};

export const dbDocumentosGuardarArchivo = async (id: string, fileData: string): Promise<void> => {
  await appDb.documentos_archivos.put({
    id,
    documentoId: id,
    fileData
  });
};

export const dbDocumentosDelete = async (id: string): Promise<void> => {
  await appDb.transaction('rw', appDb.documentos, appDb.documentos_archivos, async () => {
    await appDb.documentos.delete(id);
    await appDb.documentos_archivos.delete(id);
  });
};

export const dbDocumentosMarcarVisto = async (id: string, personUid: string): Promise<void> => {
  const doc = await appDb.documentos.get(id);
  if (doc) {
    if (!doc.vistoPor) {
      doc.vistoPor = [];
    }
    if (!doc.vistoPor.includes(personUid)) {
      doc.vistoPor.push(personUid);
      doc.updatedAt = new Date().toISOString();
      await appDb.documentos.put(doc);
    }
  }
};

export const dbCategoriasSave = async (categorias: DocumentoCategoria[]): Promise<void> => {
  await appDb.transaction('rw', appDb.documento_categorias, async () => {
    await appDb.documento_categorias.clear();
    await appDb.documento_categorias.bulkPut(categorias);
  });
};

export const dbDocumentosCheckExpiracion = async (): Promise<void> => {
  const now = new Date();
  const allDocs = await appDb.documentos.toArray();
  const toUpdate: DocumentoArchivo[] = [];
  
  for (const doc of allDocs) {
    if (doc.activo && doc.fechaExpiracion) {
      const expDate = new Date(doc.fechaExpiracion);
      if (expDate < now) {
        doc.activo = false;
        doc.archivado = true;
        doc.updatedAt = new Date().toISOString();
        toUpdate.push(doc);
      }
    }
  }
  
  if (toUpdate.length > 0) {
    await appDb.documentos.bulkPut(toUpdate);
  }
};
