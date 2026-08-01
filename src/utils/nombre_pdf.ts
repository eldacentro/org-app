/**
 * EL NOMBRE DE LOS ARCHIVOS QUE EXPORTA LA APP.
 *
 * Antes cada exportación se inventaba el suyo, y en la carpeta de descargas
 * convivían `WM_20260803-20260830.pdf`, `Field_Service_Groups.pdf`,
 * `Departamentos_agosto_2026.pdf`, `UpcomingEvents.pdf` y
 * `Contactos-Emergencia-01-08-26.pdf`: cinco idiomas de nombres, tres
 * separadores y dos formatos de fecha.
 *
 * La regla, una sola:
 *
 *     <Documento> <sufijo>.pdf
 *
 * - **El documento se llama como se llama.** El mismo nombre que lleva impreso
 *   en su propio pie. Si la hoja dice «Programa de exhibidores», el archivo se
 *   llama «Programa de exhibidores».
 * - **El sufijo identifica ESA exportación** y se escribe para que ordene solo:
 *   `2026-08` para un mes, `2026-08-03 a 2026-08-30` para un rango de semanas,
 *   o el sujeto cuando lo hay (un orador, un grupo). Sin sufijo si el documento
 *   es una foto del momento y no de un periodo.
 * - **Los formularios oficiales conservan su código delante** —`S-89`, `S-21`,
 *   `S-13`, `S-88`—, porque así los nombra la organización y así los busca
 *   quien los archiva.
 */

/** Lo que ningún sistema de archivos admite, más los que dan guerra al compartir. */
const PROHIBIDOS = /[/\\:*?"<>|\n\r\t]/g;

/**
 * Compone el nombre, ya con extensión.
 *
 * @param documento Cómo se llama el documento, tal cual va impreso.
 * @param sufijo    Qué exportación es esta: un periodo, un nombre, un grupo.
 * @param extension Sin punto. Por defecto `pdf`; cadena vacía si quien llama
 *                  añade la suya después.
 */
export const nombreArchivo = (
  documento: string,
  sufijo?: string,
  extension = 'pdf'
) => {
  const partes = [documento, sufijo]
    .filter((parte) => parte && parte.trim().length > 0)
    .map((parte) =>
      parte!.replace(PROHIBIDOS, ' ').replace(/\s+/g, ' ').trim()
    );

  const nombre = partes.join(' ');

  return extension ? `${nombre}.${extension}` : nombre;
};

const dosDigitos = (n: number) => String(n).padStart(2, '0');

const aFecha = (valor?: string | Date | null) => {
  if (!valor) return null;
  // Las semanas viajan por la app como `yyyy/MM/dd`.
  const d = valor instanceof Date ? valor : new Date(valor.replace(/\//g, '-'));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** `2026-08` — para lo que va por meses. */
export const mesArchivo = (valor?: string | Date | null) => {
  const d = aFecha(valor);
  return d ? `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}` : '';
};

/** `2026-08-03` — para un día concreto. */
export const diaArchivo = (valor?: string | Date | null) => {
  const d = aFecha(valor);
  return d
    ? `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
    : '';
};

/**
 * `2026-08-03 a 2026-08-30`, y `2026-08-03` a secas cuando es una sola semana.
 * Ordena bien porque empieza por el año.
 */
export const rangoArchivo = (
  desde?: string | Date | null,
  hasta?: string | Date | null
) => {
  const a = diaArchivo(desde);
  const b = diaArchivo(hasta);

  if (!a) return b;
  if (!b || a === b) return a;

  return `${a} a ${b}`;
};
