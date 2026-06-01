import { Table, TableBody, TableContainer } from '@mui/material';
import { TalksListViewType } from './index.types';
import useListView from './useListView';
import TalkRow from './talk_row';
import TableHead from '@components/table/TableHead';

const TalksListView = ({ isExpandAll, talks }: TalksListViewType) => {
  const { talksList, handleRequestSort, order, orderBy, tableColumns } =
    useListView(talks);

  return (
    <TableContainer>
      <Table
        stickyHeader
        size="small"
        sx={{
          '& .MuiTableHead-root .MuiTableCell-root': {
            backgroundColor: 'var(--card)',
          },
          '& .MuiTableCell-root': {
            padding: '8px',
            boxSizing: 'content-box',
            borderColor: 'var(--line)',
          },
        }}
      >
        <TableHead
          order={order}
          orderBy={orderBy}
          onRequestSort={handleRequestSort}
          columns={tableColumns}
        />
        <TableBody
          sx={{
            '& .MuiTableRow-root:last-child > .MuiTableCell-root': {
              borderBottom: 'none',
            },
          }}
        >
          {talksList.map((talk) => (
            <TalkRow
              key={talk.talk_number}
              talk={talk}
              isExpandAll={isExpandAll}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TalksListView;
