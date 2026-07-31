import { Table, TableBody, TableContainer } from '@mui/material';
import { TalksListViewType } from './index.types';
import useListView from './useListView';
import TalkRow from './talk_row';
import TableHead from '@components/table/TableHead';

const TalksListView = ({ isExpandAll, talks }: TalksListViewType) => {
  const { tableColumns } = useListView();

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
        {/* Los discursos ya vienen ordenados: el orden lo decide el desplegable de
            arriba, y aquí no se toca. `order`/`orderBy` los pide el componente
            de cabecera, pero con todas las columnas en `sortable: false` no
            pintan nada — no hay flecha que colocar. */}
        <TableHead
          order="asc"
          orderBy=""
          onRequestSort={() => undefined}
          columns={tableColumns}
        />
        <TableBody
          sx={{
            '& .MuiTableRow-root:last-child > .MuiTableCell-root': {
              borderBottom: 'none',
            },
          }}
        >
          {talks.map((talk) => (
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
