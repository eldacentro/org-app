import { StyleSheet } from '@react-pdf/renderer';

// Paleta sobria, ejecutiva (estilo limpio tipo Apple/Google).
const INK = '#1a1a2e';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const ACCENT = '#3b72c4';

export const styles = StyleSheet.create({
  body: {
    paddingTop: 44,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: 'Figtree',
    fontSize: 10,
    color: INK,
    backgroundColor: '#ffffff',
  },

  // Cabecera
  header: {
    marginBottom: 28,
    borderBottom: `2px solid ${ACCENT}`,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ACCENT,
    fontWeight: 600,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: INK,
  },
  headerMeta: {
    marginTop: 8,
    fontSize: 11,
    color: MUTED,
  },

  // Secciones
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: INK,
    marginBottom: 10,
  },

  // Tablas
  table: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: `1px solid ${LINE}`,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: `1px solid ${LINE}`,
    paddingVertical: 7,
  },
  headRow: {
    borderBottom: `1px solid ${LINE}`,
    paddingVertical: 6,
  },
  cell: {
    paddingHorizontal: 6,
    fontSize: 10,
  },
  headCell: {
    paddingHorizontal: 6,
    fontSize: 8.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: MUTED,
    fontWeight: 600,
  },

  empty: {
    fontSize: 10,
    color: MUTED,
    fontStyle: 'italic',
    paddingVertical: 6,
  },

  // Itinerario (reuniones especiales)
  itineraryItem: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottom: `1px solid ${LINE}`,
  },
  itineraryLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    color: INK,
  },
  itineraryWhen: {
    fontSize: 10,
    color: MUTED,
  },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    textAlign: 'center',
    fontSize: 8,
    color: MUTED,
  },
});
