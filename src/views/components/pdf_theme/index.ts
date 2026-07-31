/**
 * Los colores y las medidas que comparten TODOS los PDF que diseña la app.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * react-pdf no lee CSS, así que en `src/views` los colores van en crudo. Eso
 * es legítimo, pero se había convertido en que cada plantilla eligiera los
 * suyos: para el texto secundario convivían `#666666`, `#888888`, `#aaaaaa`,
 * `#333333` y `#1a1a2e` sin ningún criterio, y era lo que más se notaba al
 * poner dos hojas de la app una al lado de la otra.
 *
 * El azul sí estaba unificado —`#306CB4`, el del logotipo— y se queda.
 *
 * Los formularios OFICIALES (S-140, S-89, S-21, S-88) no usan esto: reproducen
 * impresos de la organización y su aspecto no es nuestro.
 */

export const PDF = {
  /** Texto principal. */
  ink: '#1a1a2e',
  /** Texto secundario: fechas, rótulos de columna, notas. */
  muted: '#6b7280',
  /** Texto de tercer nivel: el pie de página. */
  faint: '#9ca3af',

  /** El azul de la marca, el mismo del logotipo. */
  accent: '#306CB4',
  /** Su línea suave, para separar la cabecera y los rótulos de sección. */
  accentLine: '#d0d7e8',
  /** Su lavado, para bloques destacados. */
  accentSoft: '#eef4fc',

  /** Líneas y separadores neutros. */
  line: '#e5e7eb',
  /** La franja de las filas alternas de una tabla. */
  zebra: '#f8fafd',

  white: '#ffffff',
} as const;

/** El margen de página de los PDF de la app. */
export const PDF_PADDING = 36;
