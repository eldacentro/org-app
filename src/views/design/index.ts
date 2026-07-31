/**
 * El sistema de diseño de los PDF de la app.
 *
 * Se explica entero en `PDF_DESIGN_SYSTEM.md`, en la raíz del repo. Lo corto:
 *
 * - `Sheet` es LA hoja: márgenes, barra de marca, título y pie.
 * - `PdfSection` divide la hoja en tramos.
 * - `PdfTable` es la tabla —sin rejilla, con franja alterna—, y `PdfKeyValue`
 *   el par rótulo/valor para cuando no hay tabla.
 * - `PdfGrid` es la cuadrícula de calendario.
 * - `PdfCard`, `PdfNote`, `PdfBadge`, `PdfCapsule` y `PdfEmpty` son las piezas
 *   sueltas.
 * - `color`, `text`, `space`, `radius`, `stroke` y `page` son los cimientos:
 *   si un número no sale de ahí, no debería estar escrito en una plantilla.
 *
 * Los formularios OFICIALES (S-140, S-89, S-21, S-88) no usan nada de esto.
 */
export { default as Sheet } from './Page';
export { default as PdfTable, PdfKeyValue } from './Table';
export { default as PdfGrid } from './Grid';
export {
  PdfSection,
  PdfCard,
  PdfNote,
  PdfBadge,
  PdfCapsule,
  PdfEmpty,
} from './Blocks';
export { withCapsule } from './capsule';
export { color, text, space, radius, stroke, page } from './tokens';
export type { PdfTableColumn, PdfTableRow } from './Table';
export type { PdfGridCell } from './Grid';
