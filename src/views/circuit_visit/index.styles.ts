import { StyleSheet } from '@react-pdf/renderer';

// Los PDF no leen las variables de `global.css` — react-pdf no tiene CSS —, así
// que aquí los colores van en crudo. Son los MISMOS que en el PDF de
// Responsabilidades, que es el que marca el estilo de los exportados nuevos.
//
// El azul era `#3b72c4`, un tono suelto que no está en ninguna otra parte: el
// de la marca (y el del logotipo que ahora sale en la cabecera) es `#306CB4`.
// Puestos uno al lado del otro se notaba que eran dos azules distintos.
const INK = '#1a1a2e';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const ACCENT = '#306CB4';
const ACCENT_LINE = '#d0d7e8';
const ACCENT_SOFT = '#eef4fc';
const ZEBRA = '#f8fafd';

// Los márgenes de la página. El pie va en absoluto, así que necesita el mismo
// número a mano: si se cambia aquí, se cambia en los dos sitios.
export const PAGE_PADDING = 36;

export const styles = StyleSheet.create({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Figtree',
    fontSize: 9.6,
    color: INK,
    // Deja sitio al pie, que va en absoluto y no empuja al contenido.
    paddingBottom: 18,
  },

  // ── Cabecera: barra de marca + título ──────────────────────────────────
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  topBarBrand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topBarBrandName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: INK,
  },
  topBarDate: {
    fontSize: 8.5,
    fontWeight: 500,
    color: MUTED,
  },
  headerDivider: {
    borderBottom: `1px solid ${ACCENT_LINE}`,
    marginBottom: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: 700,
    color: INK,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: 600,
    color: ACCENT,
    marginBottom: 22,
  },

  // ── Secciones ──────────────────────────────────────────────────────────
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottom: `1px solid ${ACCENT_LINE}`,
    paddingBottom: 4,
    marginBottom: 8,
  },

  // ── Tablas ─────────────────────────────────────────────────────────────
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
  headRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottom: `1px solid ${LINE}`,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 5.5,
    borderBottom: `1px solid ${LINE}`,
  },
  // Franja tenue en las filas alternas: en una tabla de cinco columnas es lo
  // que permite seguir una fila de lado a lado sin perderla.
  rowAlt: {
    backgroundColor: ZEBRA,
  },
  headCell: {
    paddingHorizontal: 6,
    fontSize: 7.8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: MUTED,
    fontWeight: 600,
  },
  cell: {
    paddingHorizontal: 6,
    fontSize: 9.6,
  },
  // La primera columna es siempre el día: va marcada porque es por donde se
  // busca en todas estas tablas.
  cellDay: {
    fontWeight: 600,
  },
  cellMuted: {
    color: MUTED,
  },

  empty: {
    fontSize: 9.3,
    color: MUTED,
    fontStyle: 'italic',
    paddingVertical: 4,
  },

  // ── Itinerario (las dos reuniones especiales) ──────────────────────────
  // No es una tabla: son una o dos citas concretas, y son lo primero que se
  // mira. Van en bloques con fondo tenue en vez de en filas de tabla.
  itineraryItem: {
    backgroundColor: ACCENT_SOFT,
    borderLeft: `2px solid ${ACCENT}`,
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  itineraryLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: INK,
    marginBottom: 2,
  },
  itineraryWhen: {
    fontSize: 9.3,
    color: ACCENT,
    fontWeight: 500,
  },
  // Las dos reuniones de siempre van en el mismo itinerario que las especiales,
  // pero más calladas: son las de todas las semanas, no una cita que haya que
  // apuntarse. Mismo bloque y mismo sitio, gris en vez de azul.
  itineraryItemHabitual: {
    backgroundColor: 'transparent',
    borderLeft: `2px solid ${LINE}`,
  },
  itineraryWhenHabitual: {
    color: MUTED,
  },

  // ── Pie ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    borderTop: `0.5px solid ${LINE}`,
    paddingTop: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#aaaaaa',
  },
});
