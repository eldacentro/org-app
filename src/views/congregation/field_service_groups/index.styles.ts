import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },

  // ─── Single content wrapper (prevents space-between splitting) ───────────────
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
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  headerDivider: {
    borderBottom: '1 solid #d0d7e8',
    marginBottom: 14,
  },

  // ─── Groups grid ─────────────────────────────────────────────────────────────
  groupsContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 10,
  },
  groupContainer: {
    width: '32%',
    border: '1 solid #dde3f0',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  // ─── Card header ─────────────────────────────────────────────────────────────
  groupHeader: {
    backgroundColor: '#306CB4',
    padding: '7 10',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
  },
  membersCountBadge: {
    backgroundColor: '#5b9bd5',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 700,
  },

  // ─── Card body ───────────────────────────────────────────────────────────────
  groupBody: {
    padding: '8 10',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  overseerBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  overseerRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  overseerLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#306CB4',
    width: 30,
    paddingTop: 1,
  },
  overseerName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1a1a2e',
    flex: 1,
  },
  divider: {
    borderBottom: '0.5 solid #e8ecf5',
    marginVertical: 2,
  },

  // ─── Member list ─────────────────────────────────────────────────────────────
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  memberRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  memberBullet: {
    fontSize: 13,
    color: '#306CB4',
    lineHeight: 1,
  },
  groupMember: {
    fontSize: 13,
    color: '#2c2c2c',
    flex: 1,
  },

  // ─── Footer ──────────────────────────────────────────────────────────────────
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
