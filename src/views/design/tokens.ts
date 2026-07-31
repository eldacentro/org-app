/**
 * ══════════════════════════════════════════════════════════════════════════
 *  LOS CIMIENTOS DEL SISTEMA DE DOCUMENTOS IMPRESOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Implementa la especificación de `PDF_DESIGN_SYSTEM.md` §1. Todas las medidas
 * en PUNTOS (1 pt = 1/72"). A4 vertical = 595 × 842 · apaisado = 842 × 595.
 *
 * Si un número no está en este fichero, no debería estar escrito a mano en
 * ninguna plantilla.
 *
 * Ojo: react-pdf NO lee CSS, así que esto no son —ni pueden ser— las variables
 * de `global.css`. Son su equivalente para el papel, y por eso hay valores
 * repetidos. Los del papel están calibrados para tinta, no para pantalla: el
 * gris secundario es más oscuro que el de la app precisamente porque en papel
 * un gris claro se pierde.
 *
 * Los formularios OFICIALES (S-140, S-89, S-21, S-88) no usan nada de esto.
 */

// ── Color ─────────────────────────────────────────────────────────────────

export const color = {
  /** Texto principal. Más cálida que un negro puro; imprime bien. */
  ink: '#1A1A2E',
  /** Meta, subtítulos, lugares. */
  secondary: '#5D6673',
  /** Rótulos apagados, pies, vacíos. */
  faint: '#98A1AD',

  /**
   * La marca. Solo la regla de la cabecera, enlaces, el rombo de responsable y
   * momentos de marca. NUNCA texto corrido.
   */
  accent: '#306CB4',
  /** Texto sobre lavado y numerales de calendario. */
  accentDark: '#245188',
  /** Cabecera de tarjeta, bloque destacado, cápsula de fecha. */
  wash: '#EEF4FC',
  /** Borde del bloque destacado. */
  accentLine: '#C8DAF0',

  /** Contorno de tarjeta y de celda. */
  border: '#D9E2EE',
  /** Líneas interiores. */
  hairline: '#E3E8EF',
  /** Cebra de tabla y celda inactiva de calendario. */
  zebra: '#F8FAFD',
  /** Numeral y día de una celda inactiva. */
  inactive: '#C4CBD4',

  white: '#FFFFFF',

  /** Estados. Solo para eso. */
  ok: '#2F855A',
  okWash: '#EAF4EE',
  warn: '#B45309',
  warnWash: '#FBF3E8',
  danger: '#B42318',
  dangerWash: '#FBECEA',
} as const;

/**
 * Colores CATEGÓRICOS: solo clasifican, nunca visten la hoja. Se usan en un
 * cuadradito de 6×6 y en su rótulo, jamás como fondo ni como borde.
 */
export const category = {
  treasures: '#3C7F8B',
  teachers: '#C28200',
  living: '#B82B10',
  /** Los diez grupos de predicación, en el mismo orden que en la app. */
  groups: [
    '#458A43',
    '#D64D4D',
    '#5360D0',
    '#EA8135',
    '#A8B93E',
    '#944CB5',
    '#25A9A9',
    '#518ACC',
    '#946951',
    '#E46BAD',
  ],
  assembly: '#5360D0',
  visit: '#458A43',
  campaign: '#C28200',
  memorial: '#B82B10',
} as const;

// ── Tipografía ────────────────────────────────────────────────────────────
//
// Once estilos, cada uno con UN trabajo. Las versalitas son SOLO para rótulos
// de 7 a 8,5 pt: nunca en títulos, nombres ni cuerpo.

export const text = {
  /** El título de la hoja. Hay uno por documento. */
  sheetTitle: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: -0.2,
    color: color.ink,
  },
  /** Día · hora · lugar, o el alcance del documento. */
  sheetSubtitle: { fontSize: 9.5, fontWeight: 500, color: color.secondary },
  /** El periodo de vigencia, en la cápsula de la cabecera. */
  dateCapsule: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    color: color.accentDark,
  },
  /** La banda de una tarjeta. Siempre sobre lavado. */
  cardHeader: {
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: color.accentDark,
  },
  /** Título de un discurso, de un evento. */
  heading: { fontSize: 10.5, fontWeight: 700, color: color.ink },
  /** El texto normal. */
  body: { fontSize: 9, fontWeight: 400, lineHeight: 1.35, color: color.ink },
  /** Lo que se busca: el nombre propio, la hora. */
  bodyStrong: { fontSize: 9, fontWeight: 600, color: color.ink },
  /** Encabezado de columna, rótulo de un par rótulo/valor. */
  label: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: color.faint,
  },
  /** Duración, congregación, accesorios. */
  meta: { fontSize: 8, fontWeight: 500, color: color.secondary },
  /** El día del mes en cuadrículas y agendas. */
  calendarNumeral: { fontSize: 13, fontWeight: 800, color: color.accentDark },
  /** El pie de la hoja. */
  footer: { fontSize: 7, fontWeight: 400, color: color.faint },
} as const;

// ── Escalas ───────────────────────────────────────────────────────────────

export const space = {
  xs: 3,
  sm: 5,
  md: 8,
  lg: 12,
  xl: 18,
  xxl: 26,
} as const;

/**
 * Tres radios y no cuatro: 4 para una celda, 6 para tarjeta y bloque, cápsula.
 *
 * `inner` es el radio que le toca a un hijo con fondo pegado al canto de una
 * tarjeta: el exterior menos el borde. Sin él asoma el pico por la curva,
 * porque `overflow: hidden` no recorta fondos en react-pdf.
 */
export const radius = {
  cell: 4,
  card: 6,
  inner: 5.5,
  dash: 2,
  full: 999,
} as const;

/** O línea o énfasis: solo dos grosores. */
export const stroke = {
  hairline: 0.5,
  /** El guion de la regla de la cabecera. */
  dash: 2.5,
} as const;

export const page = {
  margin: 36,
  marginLandscape: 26,
  /** Alto útil de contenido, ya descontados cabecera y pie. */
  usableHeight: 786,
  usableHeightLandscape: 543,
} as const;

/**
 * MODO COMPACTO. Cuando un documento que debe caber en una hoja no cabe, se
 * aplica UNA escala global — nunca ajustes sueltos.
 *
 * No se tocan el título, la regla ni el pie. Ningún texto baja de 7,5.
 */
export const compact = {
  body: 8.2,
  rowPadding: 3,
  cardHeaderPadding: 3.5,
  cardGap: 8,
  margin: 30,
} as const;

export const normal = {
  body: text.body.fontSize,
  rowPadding: 4.5,
  cardHeaderPadding: 5,
  cardGap: 12,
  margin: page.margin,
} as const;
