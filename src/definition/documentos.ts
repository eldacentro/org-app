export type DocumentoCategoria = {
  id: string;
  nombre: string;
  color: string; // hex color para el badge
  orden: number;
  updatedAt: string;
};

export type DocumentoVigencia = 
  '1semana' | '2semanas' | '1mes' | '3meses' | 
  '6meses' | '1anyo' | 'indefinido';

export type DocumentoArchivo = {
  id: string;
  nombre: string;           // nombre del documento
  descripcion?: string;     // descripción opcional
  categoriaId: string;      // referencia a DocumentoCategoria
  fileName: string;         // nombre del archivo original
  fileSize: number;         // tamaño en bytes
  fileData?: string;        // base64 del PDF (comprimido), opcional porque la tabla principal no lo tiene
  downloadURL?: string;     // URL de Firebase Storage
  vigencia: DocumentoVigencia;
  fechaSubida: string;      // ISO date
  fechaExpiracion?: string; // ISO date, calculada al subir
  subidoPor: string;        // person_uid del anciano
  activo: boolean;
  archivado: boolean;       // true cuando expira
  vistoPor: string[];       // array de person_uid que lo han visto
  updatedAt: string;
};

export type TabloDocumentos = {
  id: string;
  updatedAt: string;
  categorias: DocumentoCategoria[];
  documentos: DocumentoArchivo[];
};

export type DocumentosArchivosDbRecord = {
  id: string;
  documentoId: string;
  fileData: string;
};
