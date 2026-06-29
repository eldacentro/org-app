import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * Abre un .jwpub de la Guía de Actividades y devuelve el MepsDocumentId de
 * cada semana en orden ascendente. Estos IDs sirven para construir deep-links
 * directos a JW Library (docid= en el finder de jw.org).
 *
 * Devuelve [] si el archivo no es un .jwpub reconocible o si falla la lectura,
 * para que el import normal de material no se rompa.
 */
export const extractMwbDocids = async (file: File): Promise<number[]> => {
  try {
    const outerZip = await JSZip.loadAsync(await file.arrayBuffer());

    const manifestFile = outerZip.file('manifest.json');
    if (!manifestFile) return [];

    const manifest = JSON.parse(await manifestFile.async('text'));
    const dbFileName = manifest?.publication?.fileName as string | undefined;
    if (!dbFileName) return [];

    const contentsFile = outerZip.file('contents');
    if (!contentsFile) return [];

    const innerZip = await JSZip.loadAsync(await contentsFile.async('arraybuffer'));
    const dbFile = innerZip.file(dbFileName);
    if (!dbFile) return [];

    const dbBytes = await dbFile.async('uint8array');
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
    const db = new SQL.Database(dbBytes);

    try {
      const result = db.exec(
        "SELECT MepsDocumentId FROM Document WHERE Class='40' ORDER BY MepsDocumentId"
      );
      if (result.length === 0) return [];
      return result[0].values.map((row) => Number(row[0]));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
};
