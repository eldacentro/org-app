/**
 * El sistema de documentos impresos de la app.
 *
 * Se especifica entero en `PDF_DESIGN_SYSTEM.md`, en la raíz del repo. Lo
 * corto:
 *
 * - `Sheet` es LA hoja: firma, cápsula de fecha, título, la regla y el pie.
 * - `PdfCard` es la tarjeta, y **siempre lleva su banda de lavado**.
 * - `PdfTable` la tabla (cebra, sin jaula), `PdfKeyValue` el par rótulo/valor.
 * - `PdfGrid` la cuadrícula de calendario, de celdas sueltas.
 * - `PdfNote` el bloque destacado —uno por hoja como máximo—, `PdfBadge` la
 *   etiqueta de estado, `PdfCategory` el color de categoría, `PdfDiamond` el
 *   rombo del responsable, `PdfEmpty` el vacío y `PdfHairline` la línea
 *   interior.
 * - `color`, `category`, `text`, `space`, `radius`, `stroke`, `page`,
 *   `normal` y `compact` son los cimientos.
 *
 * Los formularios OFICIALES (S-140, S-89, S-21, S-88) no usan nada de esto.
 */
export { default as Sheet } from './Page';
export { default as PdfTable } from './Table';
export { default as PdfGrid } from './Grid';
export {
  PdfCard,
  PdfNote,
  PdfKeyValue,
  PdfBadge,
  PdfCategory,
  PdfDiamond,
  PdfEmpty,
  PdfHairline,
} from './Blocks';
export {
  color,
  category,
  text,
  space,
  radius,
  stroke,
  page,
  normal,
  compact,
} from './tokens';
export {
  periodo,
  fechaPie,
  fechaLarga,
  fechaRango,
  fechaCortaTabla,
  nombreMes,
} from './fecha';
export type { PdfTableColumn, PdfTableRow } from './Table';
export type { PdfGridCell } from './Grid';
