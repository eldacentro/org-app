import { atom } from 'jotai';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';
import { userLocalUIDState } from './settings';

export const documentosState = atom<DocumentoArchivo[]>([]);
export const documentoCategoriasState = atom<DocumentoCategoria[]>([]);

export const unseenDocumentosCountState = atom((get) => {
  const docs = get(documentosState);
  const userUID = get(userLocalUIDState);
  
  if (!userUID) return 0;
  
  return docs.filter(d => d.activo && !d.archivado && (!d.vistoPor || !d.vistoPor.includes(userUID))).length;
});
