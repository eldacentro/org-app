import JSZip from 'jszip';
// El build ESTÁNDAR, explícito — la misma trampa que ya documenta
// `jwpub_docid_extractor.ts`. Con `from 'sql.js'` a secas, Vite resuelve la
// condición `browser` del package.json y carga `sql-wasm-browser.js`, que
// espera el binario `sql-wasm-browser.wasm`; al pasarle nuestro
// `sql-wasm.wasm` el pegamento y el wasm no casan e `initSqlJs` revienta en el
// navegador. En Node cargaba el build por defecto, así que fuera del navegador
// no se notaba nada.
import initSqlJs from 'sql.js/dist/sql-wasm.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { JwpubEntryType } from './jwpub_report';

export type JwpubParseResultType = {
  /** Código corto de idioma de JW Library ('S', 'E'…), en mayúsculas. */
  langCode: string;
  /** Cómo se llama la publicación, tal como la nombra ella misma. */
  publicationTitle: string;
  /** El símbolo del catálogo: 'S-34', 'sjj', 'pt14'… */
  symbol: string;
  entries: JwpubEntryType[];
};

/**
 * Un `.jwpub` es un zip (manifest.json + un archivo "contents" que es OTRO
 * zip) cuyo contenido real es una base de datos SQLite estándar — el mismo
 * formato que usa JW Library. Cada fila de la tabla `Document` es un
 * documento de la publicación.
 *
 * De dónde sale el NÚMERO de cada fila, y en este orden:
 *
 *   1. Del propio título, cuando viene como "N. Título" — es lo que hacen los
 *      bosquejos de discursos públicos (S-34).
 *   2. De `ChapterNumber`, cuando el título va suelto — es lo que hace el
 *      cancionero, donde el número es el del cántico.
 *
 * Las filas sin número —portada, índice, prólogo— se quedan fuera solas: no
 * casan con ninguno de los dos caminos.
 */
export const parseJwpubFile = async (
  file: File
): Promise<JwpubParseResultType> => {
  const outerZip = await JSZip.loadAsync(await file.arrayBuffer());

  const manifestFile = outerZip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('error_app_jwpub_invalid-file');
  }

  const manifest = JSON.parse(await manifestFile.async('text'));
  const dbFileName = manifest?.publication?.fileName as string | undefined;

  if (!dbFileName) {
    throw new Error('error_app_jwpub_invalid-file');
  }

  // "S-34_S.db" -> "S" (símbolo de idioma de JW Library, el mismo código
  // corto que usa la app — ver LANGUAGE_LIST en constants/index.ts).
  const langCode = dbFileName.replace(/\.db$/i, '').split('_').at(-1) ?? '';

  const contentsFile = outerZip.file('contents');
  if (!contentsFile) {
    throw new Error('error_app_jwpub_invalid-file');
  }

  const innerZip = await JSZip.loadAsync(
    await contentsFile.async('arraybuffer')
  );
  const dbFile = innerZip.file(dbFileName);

  if (!dbFile) {
    throw new Error('error_app_jwpub_invalid-file');
  }

  const dbBytes = await dbFile.async('uint8array');

  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const db = new SQL.Database(dbBytes);

  try {
    const result = db.exec(
      'SELECT DocumentId, ChapterNumber, Title FROM Document ORDER BY DocumentId'
    );

    const entries: JwpubEntryType[] = [];

    if (result.length > 0) {
      for (const row of result[0].values) {
        const chapter = row[1];
        const title = String(row[2] ?? '');

        const match = title.match(/^(\d+)\.\s*(.*)$/);

        if (match) {
          entries.push({ number: +match[1], title: match[2].trim() });
          continue;
        }

        // El cancionero: el número va en su columna y el título va limpio.
        if (typeof chapter === 'number' && chapter > 0 && title.length > 0) {
          entries.push({ number: chapter, title: title.trim() });
        }
      }
    }

    return {
      langCode: langCode.toUpperCase(),
      publicationTitle:
        manifest?.publication?.referenceTitle ??
        manifest?.publication?.title ??
        '',
      symbol: manifest?.publication?.symbol ?? '',
      entries,
    };
  } finally {
    db.close();
  }
};
