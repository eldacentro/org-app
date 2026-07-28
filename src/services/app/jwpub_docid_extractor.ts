import JSZip from 'jszip';
// Importamos el build ESTÁNDAR explícitamente. Si dejamos `from 'sql.js'`,
// Vite resuelve la condición `browser` del package.json y carga
// `sql-wasm-browser.js`, que espera el binario `sql-wasm-browser.wasm`; al
// pasarle nuestro `sql-wasm.wasm` el glue y el wasm son incompatibles y
// initSqlJs falla en el navegador (en Node sí cargaba el build default, por
// eso funcionaba en las pruebas pero no en producción). El build estándar usa
// locateFile + sql-wasm.wasm, que es justo lo que importamos abajo.
import initSqlJs from 'sql.js/dist/sql-wasm.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * Los identificadores de documento de un .jwpub, para poder enlazar a JW
 * Library por la SEMANA EXACTA en vez de por el cuaderno entero.
 *
 * Dos publicaciones, dos clases de documento:
 *
 *   Class '106' → programas semanales de la Guía de actividades (entre semana)
 *   Class  '40' → artículos de estudio de La Atalaya (fin de semana)
 *
 * En los dos casos se recorren en ORDEN NATURAL DE FILA, sin ordenar, porque
 * es lo que hace meeting-schedules-parser al producir las semanas: así
 * `docids[i]` corresponde a la semana `i` de loadPub. Si algún día se ordenara
 * aquí o allí, los enlaces apuntarían a la semana equivocada sin fallar.
 *
 * Un archivo trae una cosa o la otra, así que la lista contraria queda vacía y
 * no pasa nada.
 */
export type JwpubDocids = {
  /** Guía de actividades: una entrada por semana. */
  mwb: number[];
  /** La Atalaya (estudio): una entrada por artículo de estudio. */
  w: number[];
};

const VACIO: JwpubDocids = { mwb: [], w: [] };

export const extractJwpubDocids = async (
  file: File
): Promise<JwpubDocids> => {
  try {
    const outerZip = await JSZip.loadAsync(await file.arrayBuffer());

    const contentsFile = outerZip.file('contents');
    if (!contentsFile) return VACIO;

    const innerZip = await JSZip.loadAsync(
      await contentsFile.async('arraybuffer')
    );

    // El parser localiza la base SQLite por su extensión, no por el manifest.
    const dbEntryName = Object.keys(innerZip.files).find((name) =>
      name.endsWith('.db')
    );
    if (!dbEntryName) return VACIO;

    const dbBytes = await innerZip.files[dbEntryName].async('uint8array');
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
    const db = new SQL.Database(dbBytes);

    try {
      const leerClase = (clase: string) => {
        const result = db.exec(
          `SELECT MepsDocumentId FROM Document WHERE Class='${clase}'`
        );

        if (result.length === 0) return [];

        return result[0].values.map((row) => Number(row[0]));
      };

      return { mwb: leerClase('106'), w: leerClase('40') };
    } finally {
      db.close();
    }
  } catch {
    return VACIO;
  }
};
