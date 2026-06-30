import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * Abre un .jwpub de la Guía de Actividades y devuelve el MepsDocumentId de
 * cada semana, en el MISMO orden en que meeting-schedules-parser produce las
 * semanas. Estos IDs sirven para construir deep-links directos a JW Library
 * (docid= en el finder de jw.org).
 *
 * El parser identifica cada programa semanal del MWB con Class='106' (la 40 es
 * para La Atalaya), busca la base de datos por su extensión .db dentro del zip
 * interno «contents», y NO ordena: recorre los documentos en orden natural de
 * fila. Replicamos eso exactamente para que docids[i] corresponda a la semana i.
 *
 * Devuelve [] si el archivo no es un .jwpub reconocible o si falla la lectura,
 * para que el import normal de material no se rompa.
 */
export const extractMwbDocids = async (file: File): Promise<number[]> => {
  try {
    const outerZip = await JSZip.loadAsync(await file.arrayBuffer());

    const contentsFile = outerZip.file('contents');
    if (!contentsFile) return [];

    const innerZip = await JSZip.loadAsync(
      await contentsFile.async('arraybuffer')
    );

    // El parser localiza la base SQLite por su extensión, no por el manifest.
    const dbEntryName = Object.keys(innerZip.files).find((name) =>
      name.endsWith('.db')
    );
    if (!dbEntryName) return [];

    const dbBytes = await innerZip.files[dbEntryName].async('uint8array');
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
    const db = new SQL.Database(dbBytes);

    try {
      // Class='106' = programas semanales del MWB. Orden natural de fila, igual
      // que el parser, para que el índice cuadre con cada semana de loadPub.
      const result = db.exec(
        "SELECT MepsDocumentId FROM Document WHERE Class='106'"
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
