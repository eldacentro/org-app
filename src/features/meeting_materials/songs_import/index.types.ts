export type PendingSongsImportType = {
  langCode: string;
  publicationTitle: string;
  symbol: string;
  total: number;
  /** Un aviso que enseñar arriba del informe, si el archivo da que pensar. */
  aviso?: string;
};
