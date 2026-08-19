export type MidweekExportType = {
  open: boolean;
  onClose: VoidFunction;
  /**
   * La semana desde la que se abrió, cuando viene de «Programas semanales».
   *
   * Con ella, el diálogo cambia el selector de rango por dos opciones —esta
   * semana, o esta y la siguiente—, que es lo que se necesita cuando se está
   * imprimiendo para presidir y no se quiere elegir un rango a mano.
   *
   * Sin ella (desde la página de edición) el diálogo se comporta como siempre.
   */
  semanaBase?: string;
};

export type PDFBlobType = {
  pdfBlob: Blob;
  filename: string;
};
