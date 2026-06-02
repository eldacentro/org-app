import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 38,
    paddingHorizontal: 30,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },

  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },

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
    gap: 10,
  },
  topBarBrandName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  topBarDate: {
    fontSize: 10,
    fontWeight: 500,
    color: '#888888',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 8,
  },
  headerDivider: {
    borderBottom: '1 solid #d0d7e8',
    marginBottom: 14,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTop: '0.5 solid #e0e0e0',
    paddingTop: 7,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    fontSize: 8,
    color: '#aaaaaa',
  },
  footerRight: {
    fontSize: 8,
    color: '#aaaaaa',
  },
});

export default styles;
