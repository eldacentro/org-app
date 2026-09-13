import { useAppTranslation } from '@hooks/index';
import { Column } from '@components/table/index.types';

const useListView = () => {
  const { t } = useAppTranslation();

  const tableColumns: Column[] = [
    {
      id: 'talk_number',
      label: t('tr_shortNumberLabel'),
      sortable: false,
      sx: { width: '30px', backgroundColor: 'unset' },
    },
    {
      id: 'talk_title',
      label: t('tr_title'),
      sortable: false,
      sx: { minWidth: '120px', backgroundColor: 'unset' },
    },
    // La fecha y el orador desaparecen como COLUMNA en un móvil, pero no
    // como dato: se leen bajo el título, en la propia fila. Con las cinco
    // columnas la tabla pedía 528px dentro de un hueco de 321 —medido en un
    // móvil de 393—, así que había que arrastrar de lado para enterarse de
    // quién dio el discurso. Los mínimos de estas dos, 60 y 188, eran la mitad
    // de ese ancho.
    //
    // Y vuelven como columna a partir de 768, no de 600: entre 600 y 767 —el
    // iPhone Duo abierto en vertical mide 626— las cuatro columnas dejaban al
    // título 188px y se leía en tres líneas, con «Fecha» y «Orador» sobrando
    // vacías al lado. En ese tramo mandan el título y la fila de debajo.
    //
    // Esconderlas se llevó por delante ORDENAR por ellas, porque esta tabla se
    // ordenaba pulsando el título de la columna: en un móvil solo quedaban
    // número y título. Ahora se ordena desde el desplegable de «Ordenar por»
    // que hay arriba, junto al contador, y que ofrece los cinco órdenes en
    // cualquier tamaño de pantalla. Por eso las cabeceras ya no ordenan
    // (`sortable: false`): son el rótulo de la columna y nada más. Un mando
    // para una cosa.
    {
      id: 'last_date',
      label: t('tr_date'),
      sortable: false,
      sx: {
        width: '60px',
        backgroundColor: 'unset',
        display: { mobile: 'none', laptop: 'table-cell' },
      },
    },
    {
      id: 'last_speaker',
      label: t('tr_speaker'),
      sortable: false,
      sx: {
        width: '188px',
        backgroundColor: 'unset',
        display: { mobile: 'none', laptop: 'table-cell' },
      },
    },
    {
      id: 'history_expand',
      label: '',
      sx: { width: '24px', backgroundColor: 'unset' },
    },
  ];

  return { tableColumns };
};

export default useListView;
