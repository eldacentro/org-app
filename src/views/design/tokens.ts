/**
 * ══════════════════════════════════════════════════════════════════════════
 *  LOS CIMIENTOS DEL SISTEMA DE DISEÑO DE LOS PDF
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Todo lo que se imprime en la app sale de aquí: color, tamaño de letra,
 * espacio, radio y grosor de línea. Si un número no está en este fichero, no
 * debería aparecer escrito a mano en ninguna plantilla.
 *
 * El porqué de cada decisión está contado en `PDF_DESIGN_SYSTEM.md`, en la
 * raíz del repo. Aquí solo los valores.
 *
 * Ojo: react-pdf NO lee CSS, así que estas no son variables de `global.css`
 * ni pueden serlo. Son su equivalente para el papel, y por eso los valores
 * están repetidos —no compartidos— con los de la pantalla.
 *
 * Los formularios OFICIALES (S-140, S-89, S-21, S-88) no usan nada de esto:
 * reproducen impresos de la organización y su aspecto no nos pertenece.
 */

// ── Color ─────────────────────────────────────────────────────────────────
//
// Tres niveles de tinta, un acento y sus derivados, y las superficies. Nada
// más. Los colores de estado solo se usan para ESTADOS (suspendido, sin
// asignar), nunca para decorar.

export const color = {
  /** El texto que se lee. */
  ink: '#1a1a2e',
  /** Lo secundario: fechas, notas, valores de segundo plano. */
  muted: '#6b7280',
  /** Lo que casi no se lee: el pie de página. */
  faint: '#9ca3af',

  /** El azul de la marca. El mismo del logotipo, y el único azul. */
  accent: '#306cb4',
  /** Su tinta oscura, para texto sobre fondo claro cuando hace falta peso. */
  accentInk: '#24528a',
  /** Su línea: separa sin gritar. */
  accentLine: '#d0d7e8',
  /** Su lavado: para bloques destacados. */
  accentSoft: '#eef4fc',

  /** La línea neutra de las tablas y los marcos. */
  line: '#e3e7ec',
  /** La línea más fina de todas, para las divisiones internas. */
  lineSoft: '#eef1f5',
  /** La franja de las filas alternas. */
  zebra: '#f7f9fc',
  /** Una superficie apagada: celdas vacías, huecos. */
  surfaceMuted: '#f6f8fa',

  white: '#ffffff',

  /** Estados. Solo para eso. */
  ok: '#2f855a',
  okSoft: '#e9f5ee',
  warn: '#b45309',
  warnSoft: '#fdf4e7',
  danger: '#b42318',
  dangerSoft: '#fdeceb',
} as const;

// ── Tipografía ────────────────────────────────────────────────────────────
//
// Nueve estilos y ni uno más. Cada uno tiene UN trabajo; si un texto no encaja
// en ninguno, casi siempre es que el texto sobra, no que falte un estilo.

export const text = {
  /** El título de la hoja. Hay uno por documento. */
  display: { fontSize: 22, fontWeight: 700, color: color.ink },
  /** De qué va la hoja, debajo del título. */
  subtitle: { fontSize: 10.5, fontWeight: 600, color: color.accent },
  /** El rótulo de una sección. En versalitas para separarlo del contenido. */
  section: {
    fontSize: 9,
    fontWeight: 700,
    color: color.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  /** El título de una tarjeta o de un bloque dentro de una sección. */
  heading: { fontSize: 11, fontWeight: 700, color: color.ink },
  /** El texto normal. */
  body: { fontSize: 9.6, fontWeight: 400, color: color.ink },
  /** El texto que importa dentro de una fila: un nombre, un dato. */
  bodyStrong: { fontSize: 9.6, fontWeight: 600, color: color.ink },
  /** Rótulo de columna o de dato. Versalitas pequeñas. */
  label: {
    fontSize: 7.6,
    fontWeight: 600,
    color: color.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  /** Fecha, mes, rango: lo que acompaña sin ser el contenido. */
  meta: { fontSize: 8.5, fontWeight: 500, color: color.muted },
  /** El pie de página. */
  footnote: { fontSize: 7, fontWeight: 400, color: color.faint },
} as const;

// ── Espacio ───────────────────────────────────────────────────────────────
//
// Una escala corta. El aire entre cosas sale de aquí, no de un número a ojo.

export const space = {
  xs: 3,
  sm: 5,
  md: 8,
  lg: 12,
  xl: 18,
  xxl: 26,
} as const;

// ── Forma ─────────────────────────────────────────────────────────────────

export const radius = {
  sm: 3,
  md: 5,
  lg: 9,
  /** react-pdf lo recorta solo a la mitad del lado: sale una cápsula. */
  full: 999,
} as const;

export const stroke = {
  /** Divisiones internas: se ve, pero no pesa. */
  hair: 0.5,
  /** Marcos y separadores principales. */
  thin: 1,
} as const;

// ── Página ────────────────────────────────────────────────────────────────

export const page = {
  /** Margen de una hoja vertical. */
  margin: 36,
  /** Margen de una hoja apaisada: se estrecha para ganar ancho útil. */
  marginLandscape: 26,
  /** Alto que hay que reservarle al pie, que va en absoluto. */
  footerSpace: 20,
} as const;
