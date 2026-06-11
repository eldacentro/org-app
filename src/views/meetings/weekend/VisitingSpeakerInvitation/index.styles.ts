import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'Figtree',
    backgroundColor: '#FAFAFA',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  headerContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '2 solid #306CB4',
    paddingBottom: 15,
  },
  topBarBrand: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarBrandName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  introSection: {
    marginTop: 10,
    marginBottom: 25,
  },
  greeting: {
    fontSize: 16,
    fontWeight: 700,
    color: '#306CB4',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#444444',
    marginBottom: 6,
    textAlign: 'justify',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderTop: '4 solid #306CB4',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  mainCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  detailsRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  detailBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#306CB4',
  },
  outlineBox: {
    backgroundColor: '#F0F5FA',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  outlineValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  addressBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 5,
  },
  addressTitle: {
    fontSize: 10,
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#333333',
  },
  mediaSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    borderLeft: '3 solid #EAB308',
    marginBottom: 25,
  },
  mediaText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#555555',
  },
  boldText: {
    fontWeight: 700,
    color: '#1a1a2e',
  },
  coordinatorsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto', // pushes to bottom if inside a flex container
  },
  coordinatorCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
    border: '1 solid #EAEAEA',
  },
  coordinatorTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  coordinatorName: {
    fontSize: 10,
    fontWeight: 700,
    color: '#306CB4',
    marginBottom: 4,
  },
  coordinatorContact: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 2,
  },
});

export default styles;
