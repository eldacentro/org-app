import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  body: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  headerContainer: {
    marginBottom: 10,
    borderBottom: '1.5 solid #306CB4',
    paddingBottom: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  logoTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#306CB4',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 1,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#306CB4',
    textAlign: 'right',
  },
  
  // Estructura del Calendario
  calendarContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1 solid #cbd5e1',
    borderTop: '1 solid #cbd5e1',
    borderRadius: 8,
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
    fontSize: 9,
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
    padding: 4,
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
    fontSize: 9,
    fontWeight: 800,
    color: '#64748b',
    marginBottom: 3,
  },
  
  // Turnos de Exhibidores
  turnsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  turnBadge: {
    padding: 3,
    borderRadius: 4,
    borderLeftWidth: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
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
  
  // Textos
  timeText: {
    fontSize: 7.5,
    fontWeight: 800,
  },
  assignedTimeText: {
    color: '#1e3a8a',
  },
  unassignedTimeText: {
    color: '#b45309',
  },
  cancelledTimeText: {
    color: '#991b1b',
    textDecoration: 'line-through',
  },
  
  locationText: {
    fontSize: 7,
    fontWeight: 500,
  },
  assignedLocationText: {
    color: '#1e40af',
  },
  unassignedLocationText: {
    color: '#d97706',
  },
  cancelledLocationText: {
    color: '#ef4444',
    textDecoration: 'line-through',
  },
  
  brotherText: {
    fontSize: 7,
    fontWeight: 500,
  },
  assignedBrotherText: {
    color: '#1e3a8a',
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
    marginTop: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTop: '0.5 solid #e2e8f0',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
});

export default styles;
