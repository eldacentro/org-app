import { StyleSheet } from '@react-pdf/renderer';
import registerFonts from '@views/registerFonts';

registerFonts();

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Figtree',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 10,
    borderBottom: '1 solid #306CB4',
    paddingBottom: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTittle: {
    color: '#306CB4',
    fontWeight: 700,
    fontSize: 18,
  },
  headerCongregation: {
    color: '#666666',
    fontSize: 11,
  },
  groupsContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 8,
  },
  groupContainer: {
    width: '48.5%',
    border: '1 solid #e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  groupTitleContainer: {
    backgroundColor: '#306CB4',
    padding: '4px 6px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 700,
  },
  membersCountContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    padding: '1px 4px',
  },
  membersCount: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 700,
  },
  groupListContainer: {
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  groupOverseers: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  groupOverseerLabel: {
    fontSize: 8,
    color: '#666666',
  },
  groupOverseerName: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333333',
  },
  dashedDivider: {
    borderBottom: '0.5 solid #eeeeee',
    marginVertical: 2,
  },
  groupMemberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  groupMember: {
    fontSize: 8,
    color: '#333333',
  },
});

export default styles;
