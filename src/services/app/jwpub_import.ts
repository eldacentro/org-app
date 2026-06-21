import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  PublicTalkImportDiffType,
  PublicTalkImportEntryType,
  PublicTalkLocaleType,
} from '@definition/public_talks';

const NO_USAR_PATTERN = /^\(?no usar\)?$/i;

export type JwpubParseResultType = {
  langCode: string;
  publicationTitle: string;
  entries: PublicTalkImportEntryType[];
};

/**
 * Un .jwpub es un zip (manifest.json + un archivo "contents" que es OTRO
 * zip) cuyo contenido real es una base de datos SQLite estándar — el mismo
 * formato que usa JW Library. Cada fila de la tabla `Document` es un
 * bosquejo, con el título como "N. Título del discurso".
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

  const innerZip = await JSZip.loadAsync(await contentsFile.async('arraybuffer'));
  const dbFile = innerZip.file(dbFileName);

  if (!dbFile) {
    throw new Error('error_app_jwpub_invalid-file');
  }

  const dbBytes = await dbFile.async('uint8array');

  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const db = new SQL.Database(dbBytes);

  try {
    const result = db.exec(
      'SELECT DocumentId, Title FROM Document ORDER BY DocumentId'
    );

    const entries: PublicTalkImportEntryType[] = [];

    if (result.length > 0) {
      for (const row of result[0].values) {
        const title = String(row[1] ?? '');
        const match = title.match(/^(\d+)\.\s*(.*)$/);

        if (!match) continue;

        entries.push({
          talk_number: +match[1],
          talk_title: match[2].trim(),
        });
      }
    }

    return {
      langCode: langCode.toUpperCase(),
      publicationTitle: manifest?.publication?.title ?? '',
      entries,
    };
  } finally {
    db.close();
  }
};

/**
 * Compara lo que trae el .jwpub contra lo que la app ya muestra (que ya
 * incluye cualquier importación anterior) — solo se reportan los números de
 * bosquejo donde el título realmente difiere, para no abrumar con 194 filas
 * idénticas en la vista previa.
 */
export const computeJwpubDiff = (
  entries: PublicTalkImportEntryType[],
  currentTalks: PublicTalkLocaleType[]
): PublicTalkImportDiffType[] => {
  const diffs: PublicTalkImportDiffType[] = [];

  for (const entry of entries) {
    const current = currentTalks.find(
      (record) => record.talk_number === entry.talk_number
    );

    const previousTitle = current?.talk_title ?? '';

    if (previousTitle === entry.talk_title) continue;

    const wasRetired = NO_USAR_PATTERN.test(previousTitle.trim());
    const isNowRetired = NO_USAR_PATTERN.test(entry.talk_title.trim());

    let type: PublicTalkImportDiffType['type'] = 'renamed';

    if (!current) type = 'added';
    else if (wasRetired && !isNowRetired) type = 'reactivated';
    else if (!wasRetired && isNowRetired) type = 'retired';

    diffs.push({
      talk_number: entry.talk_number,
      type,
      previous_title: previousTitle,
      new_title: entry.talk_title,
    });
  }

  return diffs.sort((a, b) => a.talk_number - b.talk_number);
};
