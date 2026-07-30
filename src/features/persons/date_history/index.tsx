import { Box } from '@mui/material';
import Button from '@components/button';
import DatePicker from '@components/date_picker';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import { IconAdd, IconDelete } from '@icons/index';
import { DateHistoryType } from './index.types';

const DateHistory = ({
  id,
  end_date,
  onAdd,
  onDelete,
  start_date,
  isLast,
  onEndDateChange,
  onStartDateChange,
  readOnly,
}: DateHistoryType) => {
  const { t } = useAppTranslation();

  const { tablet600Down } = useBreakpoints();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Las dos fechas, y quien decide si caben lado a lado es el SITIO, no
          el ancho de la ventana.

          Antes esto era `flexWrap: tabletDown ? 'wrap' : 'nowrap'`, y con
          `nowrap` los dos campos se salían de la tarjeta: un campo de fecha no
          baja de 254px de ancho —los tres huecos de la fecha, la etiqueta y el
          botón del calendario—, así que dos no caben en una tarjeta de 480 por
          mucho que el navegador quiera encogerlos. Medido: se salía 27px por
          la derecha.

          Y el ancho de la ventana no sirve para decidirlo, porque esta fila
          vive dentro de una tarjeta que puede ser estrecha en una pantalla
          ancha (dos columnas). Con `wrap` y una base de 200 lo decide el hueco
          real: caben, y si no, se apilan a lo ancho. */}
      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          width: '100%',
          '& > *': { flex: '1 1 200px', minWidth: 0 },
        }}
      >
        <DatePicker
          label={t('tr_startDate')}
          value={new Date(start_date)}
          onChange={(value) => onStartDateChange(id, value)}
          readOnly={readOnly}
        />
        <DatePicker
          label={t('tr_endDate')}
          value={end_date === null ? null : new Date(end_date)}
          onChange={(value) => onEndDateChange(id, value)}
          readOnly={readOnly}
        />
      </Box>

      {!readOnly && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: isLast ? 'space-between' : 'flex-end',
            flexDirection: tablet600Down ? 'row' : 'row-reverse',
          }}
        >
          <Button
            variant="small"
            color="red"
            startIcon={<IconDelete />}
            sx={{
              height: '32px',
              minHeight: '32px !important',
              width: tablet600Down ? 'fit-content' : 'auto',
            }}
            onClick={() => onDelete(id)}
          >
            {t('tr_delete')}
          </Button>
          {isLast && (
            <Button
              variant="small"
              startIcon={<IconAdd />}
              sx={{
                height: '32px',
                minHeight: '32px !important',
                width: tablet600Down ? 'fit-content' : 'auto',
              }}
              onClick={onAdd}
            >
              {t('tr_add')}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DateHistory;
