import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  body: {
    padding: 20,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 20,
    borderBottom: '1 solid #306CB4',
    paddingBottom: 10,
  },
  logoTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#306CB4',
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
  },
  weekContainer: {
    marginBottom: 10,
    border: '1 solid #e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  weekTitleContainer: {
    backgroundColor: '#306CB4',
    padding: 6,
  },
  weekTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  grid: {
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  speakerRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    borderBottom: '0.5 solid #eeeeee',
    paddingBottom: 8,
    marginBottom: 4,
  },
  speakerRowLast: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    paddingBottom: 4,
  },
  infoColumn: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    fontWeight: 700,
    color: '#333333',
  },
});

export default styles;
