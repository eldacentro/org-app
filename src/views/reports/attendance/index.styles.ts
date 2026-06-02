import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  body: {
    paddingTop: 30,
    paddingBottom: 45,
    paddingHorizontal: 20,
    fontFamily: 'Figtree',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 20,
    color: '#1a1a2e',
  },
  subtitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
    color: '#1a1a2e',
  },
  section: {
    fontWeight: 'bold',
    fontSize: '13px',
    marginBottom: '5px',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
  },
  topLargeBorder: {
    borderTop: '2px solid black',
  },
  rightLargerBorder: {
    borderRight: '2px solid black',
  },
  bottomLargerBorder: {
    borderBottom: '2px solid black',
  },
  bottomNormalBorder: {
    borderBottom: '1px solid black',
  },
  leftLargerBorder: {
    borderLeft: '2px solid black',
  },
  lineNormalVertical: {
    borderRight: '1px solid black',
    alignSelf: 'stretch',
  },
  tableContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    fontWeight: 'bold',
    fontSize: '9px',
    textAlign: 'center',
  },
  column1: {
    width: '80px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  serviceYear: {
    fontSize: '10px',
  },
  column2: {
    flex: 1,
  },
  column3: {
    width: '60px',
  },
  column4: {
    flex: 1,
  },
  month: {
    padding: '3px 3px',
  },
  number: {
    textAlign: 'center',
  },
  bottomMediumBorder: {
    borderBottom: '1.5px solid black',
  },
  columnAverageLabel: {
    flex: 1,
    textAlign: 'right',
    padding: '3px',
    fontWeight: 'bold',
  },
  columnAverageNumber: {
    width: '68px',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
