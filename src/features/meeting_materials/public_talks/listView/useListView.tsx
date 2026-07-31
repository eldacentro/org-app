import { useAppTranslation } from '@hooks/index';
import { Column } from '@components/table/index.types';
import { TalksListViewType } from './index.types';
import { TalkItemType } from '../index.types';
import useSorting from '@components/table/useSorting';

const useListView = (talks: TalksListViewType['talks']) => {
  const { t } = useAppTranslation();

  const tableColumns: Column[] = [
    {
      id: 'talk_number',
      label: t('tr_shortNumberLabel'),
      sx: { width: '30px', backgroundColor: 'unset' },
    },
    {
      id: 'talk_title',
      label: t('tr_title'),
      sx: { minWidth: '120px', backgroundColor: 'unset' },
    },
    // La fecha y el orador desaparecen como COLUMNA en un móvil, pero no
    // como dato: se leen bajo el título, en la propia fila. Con las cinco
    // columnas la tabla pedía 528px dentro de un hueco de 321 —medido en un
    // móvil de 393—, así que había que arrastrar de lado para enterarse de
    // quién dio el discurso. Los mínimos de estas dos, 60 y 188, eran la mitad
    // de ese ancho.
    {
      id: 'last_date',
      label: t('tr_date'),
      sx: {
        width: '60px',
        backgroundColor: 'unset',
        display: { mobile: 'none', tablet600: 'table-cell' },
      },
    },
    {
      id: 'last_speaker',
      label: t('tr_speaker'),
      sx: {
        width: '188px',
        backgroundColor: 'unset',
        display: { mobile: 'none', tablet600: 'table-cell' },
      },
    },
    {
      id: 'history_expand',
      label: '',
      sx: { width: '24px', backgroundColor: 'unset' },
    },
  ];

  const { order, orderBy, handleRequestSort, visibleRows } = useSorting({
    initialOrder: 'asc',
    initialOrderBy: 'id',
    rows: talks as unknown as { [key: string]: string | number }[],
  });

  return {
    talksList: visibleRows as unknown as TalkItemType[],
    tableColumns,
    order,
    orderBy,
    handleRequestSort,
  };
};

export default useListView;
