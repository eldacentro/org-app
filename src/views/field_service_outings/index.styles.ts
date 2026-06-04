import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

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
    fontSize: 8.5,
    fontWeight: 500,
    color: '#888888',
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
    borderRadius: 16, // Mucho más redondeado
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
    padding: 3,
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
    fontSize: 7.6,
    fontWeight: 800,
    color: '#64748b',
    marginBottom: 2.2,
  },
  
  // Salidas individuales dentro de las celdas
  outingsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2.2,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  outingBadge: {
    padding: 2.2,
    borderRadius: 4,
    borderLeftWidth: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    width: '100%',
  },
  assignedBadge: {
    backgroundColor: '#f0f7ff',
    borderLeftColor: '#306CB4',
  },
  unassignedBadge: {
    backgroundColor: '#fffbeb',
    borderLeftColor: '#d97706',
  },
  cancelledBadge: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  
  // Textos de las salidas
  timeText: {
    fontSize: 8,
    fontWeight: 800,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
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
  
  infoText: {
    fontSize: 7.5,
    fontWeight: 500,
  },
  assignedInfoText: {
    color: '#1e40af',
  },
  unassignedInfoText: {
    color: '#d97706',
  },
  cancelledInfoText: {
    color: '#ef4444',
    textDecoration: 'line-through',
  },
  
  brotherText: {
    fontSize: 8.5,
    fontWeight: 700,
    marginTop: 1, // alinear verticalmente con el pill
  },
  assignedBrotherText: {
    color: '#334155',
  },
  unassignedBrotherText: {
    color: '#b55d02',
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
