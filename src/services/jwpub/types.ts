// Entrada del generador de .jwpub (JWPUB Studio). Un capítulo = una unidad
// de lectura (Document) escrita en Markdown.

export type JwpubChapter = {
  title: string;
  markdown: string;
};

export type JwpubInput = {
  title: string; // título de la publicación
  symbol: string; // símbolo propio, ideal con prefijo no oficial
  year: number;
  languageIndex: number; // MepsLanguageIndex (1 = español)
  chapters: JwpubChapter[];
};

// HTML MEPS de un capítulo + posiciones de párrafo (offsets de bytes UTF-8).
export type BuiltDocumentHtml = {
  html: string;
  contentLength: number; // bytes UTF-8
  paragraphs: { index: number; begin: number; end: number }[];
};
