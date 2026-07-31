import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

/** El color de la uñita de cada estado. Antes era el `borderLeftColor` del
 *  bloque; ahora se lo lleva la cápsula, que no es un borde: ver
 *  `@views/components/accent_capsule`. */
export const COLOR_CAPSULA = {
  asignado: '#306CB4',
  sinAsignar: '#d97706',
  suspendido: '#ef4444',
};

const styles = StyleSheet.create({
  body: {
    paddingTop: 18,
    paddingBottom: 25,
    paddingHorizontal: 20,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    paddingBottom: 25,
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4.5,
  },
  topBarBrand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7.5,
  },
  topBarBrandName: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  topBarDate: {
    fontSize: 16,
    fontWeight: 700,
    color: '#475569',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  headerDivider: {
    borderBottom: '1 solid #d0d7e8',
    marginBottom: 9,
  },

  // Estructura del Calendario
  calendarContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    border: '1 solid #cbd5e1',
    borderRadius: 16,
    overflow: 'hidden',
  },
  weekdaysHeader: {
    height: 20,
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#306CB4',
    borderBottom: '1 solid #306CB4',
  },
  weekdayCell: {
    flex: 1,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderRight: '1 solid #306CB4',
  },
  weekdayText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 700,
  },

  weekRow: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
  },

  // Celda del Día
  cell: {
    flex: 1,
    borderRight: '1 solid #cbd5e1',
    borderBottom: '1 solid #cbd5e1',
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  emptyCell: {
    flex: 1,
    borderRight: '1 solid #cbd5e1',
    borderBottom: '1 solid #cbd5e1',
    backgroundColor: '#f8fafc',
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    marginBottom: 3.5,
  },

  // Turnos de Exhibidores
  turnsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3.5,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  // El sangrado de la izquierda lo pone `accentCapsuleSurface()`, que es quien
  // sabe cuánto ocupa la cápsula; aquí solo el resto del relleno.
  turnBadge: {
    paddingVertical: 3.5,
    paddingRight: 3.5,
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 1.8,
    width: '100%',
  },
  assignedBadge: {
    backgroundColor: '#f0f7ff',
  },
  unassignedBadge: {
    backgroundColor: '#fffbeb',
  },
  cancelledBadge: {
    backgroundColor: '#fef2f2',
  },

  // Textos
  timeText: {
    fontSize: 9.3,
    fontWeight: 800,
    paddingHorizontal: 3.5,
    paddingVertical: 1.2,
    borderRadius: 4,
    color: '#ffffff',
    overflow: 'hidden',
  },
  assignedTimeText: {
    backgroundColor: '#306CB4',
  },
  unassignedTimeText: {
    backgroundColor: '#d97706',
  },
  cancelledTimeText: {
    backgroundColor: '#ef4444',
    textDecoration: 'line-through',
  },

  brotherText: {
    fontSize: 8.8,
    fontWeight: 500,
  },
  assignedBrotherText: {
    color: '#334155',
  },
  responsibleBrotherText: {
    fontWeight: 800,
    color: '#0f172a',
  },
  unassignedBrotherText: {
    color: '#b55d02',
    fontWeight: 700,
  },
  cancelledBrotherText: {
    color: '#991b1b',
    textDecoration: 'line-through',
  },

  // Pie de Página
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    borderTop: '0.5 solid #e0e0e0',
    paddingTop: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    fontSize: 7,
    color: '#aaaaaa',
  },
  footerRight: {
    fontSize: 7,
    color: '#aaaaaa',
  },
});

export default styles;
