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
  /**
   * De qué NÚMERO salió el archivo, si consta.
   *
   * Un .jwpub trae un número entero, así que todas sus semanas comparten éste.
   * Hace falta porque el mes de portada de La Atalaya NO es el mes en que se
   * estudia —la de septiembre se estudia del 2 de noviembre al 6 de
   * diciembre— y la app solo guardaba las semanas de estudio: al importar la
   * de septiembre no quedaba ni rastro de que fuera la de septiembre.
   *
   * Sale del `manifest.json`, que ya viene en el mismo zip que la base.
   */
  numero?: NumeroPublicacion;
};

export type NumeroPublicacion = {
  /** 'w26.09' */
  simbolo: string;
  /** 'La Atalaya, septiembre de 2026' — tal como lo escribe la publicación. */
  titulo: string;
  /** 'YYYY/MM' de la PORTADA, no del estudio. */
  mesDePortada?: string;
};

const VACIO: JwpubDocids = { mwb: [], w: [] };

/**
 * El número de portada, del manifiesto del .jwpub.
 *
 * `issueId` viene como 20260900: año, mes y dos dígitos de variación.
 */
const leerNumero = (manifest: unknown): NumeroPublicacion | undefined => {
  const pub = (manifest as { publication?: Record<string, unknown> })
    ?.publication;
  if (!pub) return undefined;

  const props = pub.issueProperties as Record<string, string> | undefined;
  const simbolo = props?.symbol ?? (pub.symbol as string);
  const titulo = props?.title;

  if (!simbolo && !titulo) return undefined;

  let mesDePortada: string | undefined;
  const issueId = Number(pub.issueId);

  if (Number.isFinite(issueId) && issueId > 10000000) {
    const year = Math.floor(issueId / 10000);
    const mes = Math.floor(issueId / 100) % 100;

    if (mes >= 1 && mes <= 12) {
      mesDePortada = `${year}/${String(mes).padStart(2, '0')}`;
    }
  }

  return { simbolo, titulo: titulo ?? simbolo, mesDePortada };
};

export const extractJwpubDocids = async (file: File): Promise<JwpubDocids> => {
  try {
    const outerZip = await JSZip.loadAsync(await file.arrayBuffer());

    // El número de portada, del manifiesto: viene en el mismo zip.
    let numero: NumeroPublicacion | undefined;

    try {
      const manifestFile = outerZip.file('manifest.json');

      if (manifestFile) {
        numero = leerNumero(JSON.parse(await manifestFile.async('string')));
      }
    } catch {
      // Un manifiesto ilegible no puede impedir la importación: sin él se
      // pierde el número de portada, que es un extra, no el material.
    }

    const contentsFile = outerZip.file('contents');
    if (!contentsFile) return { ...VACIO, numero };

    const innerZip = await JSZip.loadAsync(
      await contentsFile.async('arraybuffer')
    );

    // El parser localiza la base SQLite por su extensión, no por el manifest.
    const dbEntryName = Object.keys(innerZip.files).find((name) =>
      name.endsWith('.db')
    );
    if (!dbEntryName) return { ...VACIO, numero };

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

      return { mwb: leerClase('106'), w: leerClase('40'), numero };
    } finally {
      db.close();
    }
  } catch {
    return VACIO;
  }
};
