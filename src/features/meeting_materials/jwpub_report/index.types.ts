import { JwpubReportType } from '@services/app/jwpub_report';

export type JwpubReportDialogProps = {
  open: boolean;
  report: JwpubReportType;
  /** "bosquejo" / "cántico" — para escribir los plurales, no concatenarlos. */
  entidadSingular: string;
  entidadPlural: string;
  /** Cómo se llama la publicación del archivo. Es la procedencia. */
  publicationTitle: string;
  /** Un aviso opcional arriba: p. ej. que el archivo no parece un cancionero. */
  aviso?: string;
  isSaving: boolean;
  onCancel: VoidFunction;
  onConfirm: VoidFunction;
};
