export type DocumentoCategoria = {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  updatedAt: string;
};

export type DocumentoVigencia =
  '1semana' | '2semanas' | '1mes' | '3meses' |
  '6meses' | '1anyo' | 'indefinido';

export type DocumentoArchivo = {
  id: string;
  nombre: string;
  descripcion?: string;
  categoriaId: string;
  fileName: string;
  fileSize: number;
  fileData?: string;        // solo caché local en IndexedDB, nunca en Firestore
  downloadURL: string;
  vigencia: DocumentoVigencia;
  fechaSubida: string;
  fechaExpiracion?: string;
  subidoPor: string;
  vistoPor: string[];
  updatedAt: string;
};

export type DocumentosArchivosDbRecord = {
  id: string;
  documentoId: string;
  fileData: string;
};
