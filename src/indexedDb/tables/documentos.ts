import { Table } from 'dexie';
import { 
  DocumentoArchivo, 
  DocumentosArchivosDbRecord,
  DocumentoCategoria
} from '@definition/documentos';

export type DocumentosTable = {
  documentos: Table<DocumentoArchivo>;
  documentos_archivos: Table<DocumentosArchivosDbRecord>;
  documento_categorias: Table<DocumentoCategoria>;
};

export const documentosSchema = {
  documentos: 'id, updatedAt, categoriaId, activo, archivado',
  documentos_archivos: 'id, documentoId',
  documento_categorias: 'id, updatedAt, orden',
};
