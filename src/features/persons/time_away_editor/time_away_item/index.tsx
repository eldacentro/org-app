import { Box, Stack } from '@mui/material';
import { IconDelete, IconInfo } from '@icons/index';
import Button from '@components/button';
import DatePicker from '@components/date_picker';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import SegmentedControl from '@components/segmented_control';
import {
  getTimeAwayDayCount,
  getTimeAwayDuration,
  TimeAwayDuration,
} from '@services/app/time_away';
import { addDays, formatDateShortMonth } from '@utils/date';
import { TimeAwayItemType } from './index.types';
import { useAppTranslation, useBreakpoints } from '@hooks/index';

/**
 * Un periodo de ausencia.
 *
 * Antes eran dos campos de fecha a secas, y dejar el segundo vacío significaba
 * "sin fecha de vuelta" sin que nada lo dijera. Quien solo quería apuntar un
 * día ponía la fecha de salida, dejaba la otra en blanco, y se quedaba marcado
 * como ausente para siempre — salía como ausente al programar reuniones meses
 * después y nadie entendía por qué.
 *
 * Ahora la duración se elige a propósito entre tres opciones, y debajo se lee
 * en palabras lo que se va a guardar. Ninguna de las tres es un descuido.
 */

const DURATION_TABS: TimeAwayDuration[] = ['single', 'until', 'open'];

/**
 * Una fila a medio guardar puede traer la fecha vacía o ilegible, y con eso
 * `new Date()` devuelve una fecha inválida que revienta al formatear
 * ("Invalid time value" — ya ha pasado en esta app). Aquí se cae a hoy: es
 * exactamente lo que propone el editor al añadir una ausencia nueva.
 */
const safeDate = (value: string) => {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const TimeAwayItem = ({
  start_date,
  end_date,
  comments,
  id,
  onDatesChange,
  onCommentsChange,
  onDelete,
  readOnly,
}: TimeAwayItemType) => {
  const { t } = useAppTranslation();

  const { tabletDown } = useBreakpoints();

  const startDate = safeDate(start_date);
  const endDate = end_date ? safeDate(end_date) : null;

  // La duración NO se guarda: se lee de las fechas. Así no hay dos verdades
  // que puedan discrepar — ni un control diciendo "un solo día" sobre un
  // registro de quince, que es lo que pasaría con un estado local propio si
  // la sincronización cambiara el registro por debajo.
  const duration = getTimeAwayDuration(start_date, end_date);

  const dayCount = getTimeAwayDayCount(start_date, end_date);

  // Solo puede pasar con datos viejos: los selectores de abajo ya no dejan
  // ponerlo del revés. Aun así hay que decirlo, porque un periodo invertido no
  // lo encuentra nadie y esa persona deja de salir como ausente.
  const invalidRange = duration === 'until' && dayCount === null;

  const handleDurationChange = (index: number) => {
    const next = DURATION_TABS[index];

    if (next === 'single') {
      return onDatesChange(id, startDate, startDate);
    }

    if (next === 'open') {
      return onDatesChange(id, startDate, null);
    }

    // "Hasta una fecha" necesita una vuelta posterior a la salida: si cayera
    // el mismo día, esto volvería a leerse como "un solo día" y el control
    // daría un salto delante de quien lo acaba de pulsar. Se propone una
    // semana desde hoy (o desde la salida, si aún no ha llegado) y quien
    // edita ajusta.
    const from = startDate > new Date() ? startDate : new Date();

    onDatesChange(id, startDate, addDays(from, 7));
  };

  const handleStartChange = (value: Date) => {
    if (!value || Number.isNaN(value.getTime())) return;

    if (duration === 'open') return onDatesChange(id, value, null);

    // En "un solo día" la vuelta ES la salida: se mueven juntas. Antes esto
    // eran dos guardados seguidos y uno se comía al otro.
    if (duration === 'single') return onDatesChange(id, value, value);

    onDatesChange(id, value, endDate);
  };

  const summary = (() => {
    const start = formatDateShortMonth(startDate);

    if (duration === 'open') {
      return `Ausente desde el ${start}, sin fecha de vuelta.`;
    }

    if (invalidRange) return 'La fecha de vuelta es anterior a la de salida.';

    if (dayCount === 1) return `Ausente solo el ${start}.`;

    return `Ausente del ${start} al ${formatDateShortMonth(endDate)} — ${dayCount} días.`;
  })();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          flexWrap: tabletDown ? 'wrap' : 'nowrap',
          justifyContent: 'space-between',
          flexDirection: 'row',
          width: '100%',
        }}
      >
        <DatePicker
          label={t('tr_startDate')}
          value={startDate}
          onChange={handleStartChange}
          readOnly={readOnly}
          // Ni desde aquí ni desde el otro selector se puede dejar la vuelta
          // antes de la salida.
          maxDate={duration === 'until' ? endDate : undefined}
        />

        {duration === 'until' && (
          <DatePicker
            label={t('tr_endDate')}
            value={endDate}
            onChange={(value) => onDatesChange(id, startDate, value)}
            readOnly={readOnly}
            minDate={startDate}
          />
        )}
      </Box>

      {!readOnly && (
        <Stack spacing="8px">
          <Typography className="label-small-semibold" color="var(--ink-2)">
            ¿Cuánto dura?
          </Typography>

          <SegmentedControl
            ariaLabel="Duración de la ausencia"
            tabs={['Un solo día', 'Hasta una fecha', 'Sin fecha de vuelta']}
            active={DURATION_TABS.indexOf(duration)}
            onChange={handleDurationChange}
          />
        </Stack>
      )}

      <Typography
        className="body-small-regular"
        color={invalidRange ? 'var(--red-main)' : 'var(--ink-2)'}
      >
        {summary}
      </Typography>

      {/* Lo que de verdad hay que entender antes de dejarla abierta: no es
          "todavía no sé la fecha", es "cuenta como ausente indefinidamente". */}
      {duration === 'open' && !readOnly && (
        <InfoTip
          isBig={false}
          color="warning"
          icon={<IconInfo color="var(--amber)" />}
          text="Sin fecha de vuelta se sigue contando como ausente en todos los programas futuros, aunque pasen meses. Elígelo solo si de verdad no se sabe cuándo vuelve; si es un viaje con fecha, pon la de vuelta."
        />
      )}

      <TextField
        label={t('tr_comments')}
        value={comments}
        onChange={(e) => onCommentsChange(id, e.target.value)}
        slotProps={{ input: { readOnly } }}
      />

      {!readOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="small"
            color="red"
            startIcon={<IconDelete />}
            sx={{ height: '32px', minHeight: '32px !important' }}
            onClick={() => onDelete(id)}
          >
            {t('tr_delete')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TimeAwayItem;
