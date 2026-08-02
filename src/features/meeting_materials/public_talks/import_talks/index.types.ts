import { ChangeEvent, RefObject } from 'react';
import { JwpubReportType } from '@services/app/jwpub_report';

export type PendingJwpubImportType = {
  langCode: string;
  publicationTitle: string;
  /** Un aviso que enseñar arriba del informe, si el archivo da que pensar. */
  aviso?: string;
};

/**
 * Dónde se pinta el disparador de la importación.
 *
 * `navbar` es el botón de la barra de Discursos públicos, el de siempre.
 * `row` es la fila de tarjeta de Materiales de reunión, al lado de las otras
 * dos importaciones. La lógica es la misma; lo único que cambia es desde
 * dónde se llama.
 */
export type ImportTalksVariantType = 'navbar' | 'row';

export type ImportTalksReturnType = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleOpenFilePicker: () => void;
  handleFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  isParsing: boolean;
  isSaving: boolean;
  report: JwpubReportType | null;
  pendingImport: PendingJwpubImportType | null;
  handleCancel: () => void;
  handleConfirm: () => void;
};
