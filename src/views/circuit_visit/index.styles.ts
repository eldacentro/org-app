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
    marginBottom: 11,
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
    marginBottom: 16,
  },

  // ── Secciones ──────────────────────────────────────────────────────────
  // El aire entre secciones es lo primero que se recorta cuando el programa
  // amenaza con irse a una segunda hoja: la raya del rótulo ya separa.
  section: {
    marginBottom: 13,
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
  //
  // Solo franjas: ni una raya. Antes cada fila llevaba su línea por debajo Y su
  // franja, dos maneras de decir lo mismo — y con las líneas puestas, la franja
  // se veía como suciedad en vez de como ayuda. Quitadas las líneas, la franja
  // sola separa las filas, y la cabecera se distingue porque es lo único que
  // queda en blanco arriba del todo.
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
  headRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingBottom: 5,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 5,
    borderRadius: 3,
  },
  // La franja va en las filas PARES, empezando por la primera. La cabecera no
  // tiene fondo, así que si la primera fila tampoco lo tuviera, arriba
  // quedarían dos blancos seguidos y la cuenta empezaba mal: parecía que la
  // cabecera formaba pareja con la primera fila.
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

  // ── Densidad apretada ──────────────────────────────────────────────────
  //
  // El programa tiene que caber en UNA hoja: es lo que se cuelga en el tablón
  // y lo que se lleva la gente. Pero el número de filas no lo decide el
  // diseño: una semana con dos salidas de predicación cada día y cinco
  // comidas trae el doble de filas que otra normal.
  //
  // Así que cuando hay muchas filas, la hoja se aprieta sola: mismo dibujo,
  // mismos colores y mismas franjas, solo un punto más pequeño y con menos
  // aire. Es lo mismo que hace el PDF de Responsabilidades. Los números salen
  // de medir el PDF de verdad, no de calcular: ver `DENSIDAD` en index.tsx.
  sectionCompact: {
    marginBottom: 9,
  },
  rowCompact: {
    paddingVertical: 3,
  },
  cellCompact: {
    fontSize: 8.6,
  },
  headCellCompact: {
    fontSize: 7.2,
  },
  itineraryItemCompact: {
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  itineraryLabelCompact: {
    fontSize: 9.2,
  },
  itineraryWhenCompact: {
    fontSize: 8.6,
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitleCompact: {
    fontSize: 9.6,
    marginBottom: 11,
  },
  headerDividerCompact: {
    marginBottom: 8,
  },

  // ── Itinerario ─────────────────────────────────────────────────────────
  // No es una tabla: son cuatro citas concretas, y son lo primero que se mira.
  // Van en bloques, y los bloques en dos columnas — las de siempre a un lado y
  // las especiales de la visita al otro.
  itineraryGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  },
  itineraryColumn: {
    display: 'flex',
    flexDirection: 'column',
    // `flexBasis: 0` obliga a las dos columnas a medir lo mismo. Sin él,
    // reparten según lo que ocupe su texto y la de las reuniones especiales
    // —que tiene los rótulos largos— se comía a la otra.
    flexGrow: 1,
    flexBasis: 0,
  },
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
