import { EnhancedTableProps } from '@components/table/index.types';
import { MouseEvent } from 'react';
import {
  Box,
  Stack,
  TableCell,
  TableHead as MUITableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { IconDown } from '@icons/index';
import { visuallyHidden } from '@mui/utils';

const alignCenterArray = ['action', 'number'];

/**
 * Component for rendering the head of a table.
 * @param props - The props for the TableHead component.
 * @returns A JSX element representing the table head.
 */
const TableHead = (props: EnhancedTableProps) => {
  const { order, orderBy, onRequestSort, columns } = props;

  /**
   * Creates a handler function for sorting table columns.
   * @param property - The property to sort by.
   * @returns A function that handles sorting when a column header is clicked.
   */
  const createSortHandler =
    (property: string) => (event: MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <MUITableHead>
      <TableRow>
        {columns.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={alignCenterArray.includes(headCell.type) ? 'center' : 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{
              backgroundColor: 'var(--accent-100)',
              borderColor: 'var(--accent-200);',
              ...headCell.sx,
            }}
          >
            {/* La columna de acciones no lleva título, y aquí TODAS las
                columnas se envolvían en un control de ordenar. Resultado: un
                botón de 0×0 al que se llega con el tabulador, que no dice nada
                y que ordenaría por una columna que no se ordena. Sin título no
                hay nada por lo que ordenar, así que va la celda a secas.

                Lo mismo con `sortable: false`: hay tablas que ordenan desde un
                desplegable, y ahí la cabecera es un rótulo, no un mando. */}
            {headCell.label && headCell.sortable !== false ? (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
                style={{ position: 'relative' }}
                IconComponent={(props) => (
                  <Stack
                    {...props}
                    style={{ position: 'absolute', right: '-25px' }}
                  >
                    <IconDown
                      color={'var(--grey-350)'}
                      width={18}
                      height={18}
                    />
                  </Stack>
                )}
              >
                <Typography
                  className={'body-small-regular'}
                  color={'var(--grey-350)'}
                >
                  {headCell.label}
                </Typography>
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc'
                      ? 'ordenado de mayor a menor'
                      : 'ordenado de menor a mayor'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              // Sin control de ordenar, pero el título se sigue leyendo: es
              // lo que dice qué hay en la columna. Solo desaparece cuando la
              // columna no tiene título, que es el caso de la de acciones.
              headCell.label && (
                <Typography
                  className={'body-small-regular'}
                  color={'var(--grey-350)'}
                >
                  {headCell.label}
                </Typography>
              )
            )}
          </TableCell>
        ))}
      </TableRow>
    </MUITableHead>
  );
};

export default TableHead;
