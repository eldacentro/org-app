import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  body: {
    padding: 24,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 16,
    borderBottom: '1.5 solid #306CB4',
    paddingBottom: 12,
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
    fontSize: 22,
    fontWeight: 800,
    color: '#306CB4',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#306CB4',
    textAlign: 'right',
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  weekCard: {
    width: '48.5%',
    border: '1 solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  weekHeader: {
    backgroundColor: '#306CB4',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  weekTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  outingsList: {
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  outingRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottom: '0.5 solid #f1f5f9',
  },
  dayCol: {
    width: '22%',
    fontSize: 10,
    fontWeight: 700,
    color: '#1e293b',
  },
  timeCol: {
    width: '12%',
    fontSize: 10,
    fontWeight: 700,
    color: '#306CB4',
  },
  locationCol: {
    width: '31%',
    fontSize: 9,
    color: '#64748b',
    paddingRight: 4,
  },
  brotherCol: {
    width: '35%',
    fontSize: 10,
    fontWeight: 700,
    color: '#334155',
    textAlign: 'right',
  },
  unassignedText: {
    color: '#d32f2f',
    fontWeight: 700,
  },
  cancelledText: {
    textDecoration: 'line-through',
    color: '#94a3b8',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '0.5 solid #e2e8f0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
  },
});

export default styles;
