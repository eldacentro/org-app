import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },

  // ─── Header ──────────────────────────────────────────────────────────────────
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
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
  topBarRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  coContactName: {
    fontSize: 8.7,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  coContactLine: {
    fontSize: 7.5,
    color: '#555555',
  },
  headerDivider: {
    borderBottom: '1 solid #d0d7e8',
    marginBottom: 2,
  },

  // ─── Banner del grupo (uno por página) ───────────────────────────────────────
  groupBanner: {
    backgroundColor: '#306CB4',
    borderRadius: 10,
    padding: '5 8',
    marginBottom: 4,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupBannerTitle: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: 700,
  },
  membersCountBadge: {
    backgroundColor: '#5b9bd5',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersCount: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: 700,
  },
  emptyGroupText: {
    fontSize: 9.5,
    color: '#aaaaaa',
    fontStyle: 'italic',
  },

  // ─── Cuadrícula de tarjetas (2 columnas) ─────────────────────────────────────
  memberGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 3,
  },

  // ─── Tarjeta de miembro ──────────────────────────────────────────────────────
  memberCard: {
    width: '49%',
    border: '1 solid #dde3f0',
    borderRadius: 7,
    padding: '2 6',
    display: 'flex',
    flexDirection: 'column',
  },
  memberName: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 1.2,
  },
  memberInfoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.4,
  },
  memberInfoItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  memberInfoLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#306CB4',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    width: 48,
    paddingTop: 0.6,
  },
  memberInfoValue: {
    fontSize: 10.3,
    color: '#2c2c2c',
    flex: 1,
  },
  emergencyBlock: {
    marginTop: 1.5,
    backgroundColor: '#fff7e6',
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.4,
  },
  emergencyContactRow: {
    display: 'flex',
    flexDirection: 'column',
  },
  emergencyLabel: {
    fontSize: 7.8,
    fontWeight: 700,
    color: '#b8860b',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  emergencyValue: {
    fontSize: 10.3,
    color: '#5c4a13',
    fontWeight: 700,
  },
  emergencyPhone: {
    fontSize: 10,
    color: '#5c4a13',
    fontWeight: 500,
  },
  emergencyMissing: {
    fontSize: 8.2,
    color: '#c0392b',
    fontStyle: 'italic',
    marginTop: 3,
  },
});

export default styles;
