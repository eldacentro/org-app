import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconChevronLeft, IconChevronRight } from '@components/icons';
import IconButton from '@components/icon_button';
import ProgressBarSmall from '@components/progress_bar_small';
import Typography from '@components/typography';
import SubmitButton from '@features/ministry/report/form_S4/submit_button';
import useMonthView from '../month_view/useMonthView';
import DayRow from './day_row';

/**
 * Todos los días del mes, visibles y editables a la vez — sin diálogo. Cada
 * fila muestra un resumen (horas + estudios) y se expande en su propio
 * lugar en la lista para editar, en vez de abrir "Registro diario" aparte.
 *
 * Reutiliza el mismo cálculo de días/meta que la vista Mes (`useMonthView`)
 * para no duplicar esa lógica una segunda vez.
 */
const DayView = () => {
  const { t } = useAppTranslation();

  const {
    cells,
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    hoursValue,
    goal,
    hours_total,
    locked,
    selectedMonth,
    person_uid,
  } = useMonthView();

  const dayCells = cells.filter((cell) => cell.date);

  return (
    <Stack spacing="12px">
      <CardContainer>
        {goal !== undefined && (
          <Stack spacing="6px" sx={{ marginBottom: '4px' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography className="body-small-semibold" color="var(--grey-400)">
                {t('tr_hours', 'Horas')}
              </Typography>
              <Typography className="body-small-semibold">
                {hours_total} / {goal}h
              </Typography>
            </Stack>
            <ProgressBarSmall value={hoursValue} maxValue={goal} />
          </Stack>
        )}

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <IconButton onClick={goToPreviousMonth}>
            <IconChevronLeft color="var(--ink)" />
          </IconButton>
          <Typography className="h3" sx={{ textTransform: 'capitalize' }}>
            {monthLabel}
          </Typography>
          <IconButton onClick={goToNextMonth}>
            <IconChevronRight color="var(--ink)" />
          </IconButton>
        </Stack>

        {locked && (
          <Typography
            className="body-small-regular"
            color="var(--grey-400)"
            sx={{ textAlign: 'center', marginTop: '8px' }}
          >
            {t('tr_monthReportLockedInfo', 'Este mes ya se envió, solo puedes consultarlo')}
          </Typography>
        )}
      </CardContainer>

      <Stack spacing="8px">
        {dayCells.map((cell) => (
          <DayRow key={cell.dateStr} cell={cell} locked={locked} />
        ))}
      </Stack>

      <SubmitButton month={selectedMonth} person_uid={person_uid} publisher={true} />
    </Stack>
  );
};

export default DayView;
