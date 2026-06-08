import { atom } from 'jotai';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';
import { userLocalUIDState } from './settings';

export const documentosState = atom<DocumentoArchivo[]>([]);
export const documentoCategoriasState = atom<DocumentoCategoria[]>([]);

export const unseenDocumentosCountState = atom((get) => {
  const docs = get(documentosState);
  const userUID = get(userLocalUIDState);
  
  if (!userUID) return 0;
  
  const now = new Date();
  return docs.filter(d => {
    const notExpired = !d.fechaExpiracion || new Date(d.fechaExpiracion) > now;
    return notExpired && (!d.vistoPor || !d.vistoPor.includes(userUID));
  }).length;
});
