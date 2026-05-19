import { StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  body: {
    padding: 20,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 10,
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
    fontSize: 18,
    fontWeight: 700,
    color: '#306CB4',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
  },
  weekContainer: {
    marginBottom: 8,
    padding: 8,
    border: '1 solid #e0e0e0',
    borderRadius: 8,
  },
  weekTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#333333',
    marginBottom: 4,
    backgroundColor: '#f5f5f5',
    padding: 4,
    borderRadius: 4,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deptBox: {
    width: '48%',
    marginBottom: 5,
  },
  deptTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#306CB4',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  roleRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    borderBottom: '0.5 solid #eeeeee',
    paddingBottom: 2,
  },
  roleLabel: {
    fontSize: 9,
    color: '#666666',
  },
  personName: {
    fontSize: 9,
    fontWeight: 500,
    color: '#000000',
  },
});

export default styles;
