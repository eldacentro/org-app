import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconChevronLeft, IconChevronRight } from '@components/icons';
import IconButton from '@components/icon_button';
import ProgressBarSmall from '@components/progress_bar_small';
import Typography from '@components/typography';
import SubmitButton from '@features/ministry/report/form_S4/submit_button';
import useMonthView from './useMonthView';
import { MonthViewProps } from './index.types';

/**
 * Calendario del mes — sin librería, construido con aritmética simple de
 * fechas (igual que ya hace el resto de la app). Cada celda solo muestra un
 * punto discreto si ese día tiene horas o estudios registrados (no el
 * número exacto, sería demasiado denso) — clic en un día lleva a la vista
 * Día para editarlo con detalle. Así solo hay UN lugar donde de verdad se
 * edita el dato, no dos.
 */
const MonthView = ({ onSelectDay }: MonthViewProps) => {
  const { t } = useAppTranslation();

  const {
    dayNamesShort,
    cells,
    monthLabel,
    goToPreviousMonth,
    goToNextMonth,
    hoursValue,
    goal,
    hours_total,
    selectedMonth,
    person_uid,
  } = useMonthView();

  return (
    <Stack spacing="12px">
      <CardContainer>
        {goal !== undefined && (
          <Stack spacing="6px">
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

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {dayNamesShort.map((name, idx) => (
            <Typography
              key={idx}
              className="label-small-semibold"
              color="var(--grey-350)"
              sx={{ textAlign: 'center', textTransform: 'uppercase' }}
            >
              {name.slice(0, 1)}
            </Typography>
          ))}

          {cells.map((cell, idx) => (
            <Box
              key={cell.dateStr || `blank-${idx}`}
              onClick={cell.date ? onSelectDay : undefined}
              sx={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                borderRadius: 'var(--radius-m, 8px)',
                cursor: cell.date ? 'pointer' : 'default',
                backgroundColor: cell.isToday ? 'var(--brand-tint)' : 'transparent',
                '&:hover': cell.date ? { backgroundColor: 'rgba(var(--black-base), 0.04)' } : {},
              }}
            >
              {cell.date && (
                <>
                  <Typography
                    className="body-small-semibold"
                    color={cell.isToday ? 'var(--brand-deep)' : 'var(--ink)'}
                  >
                    {cell.dayNum}
                  </Typography>
                  <Box
                    sx={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: cell.hasRecord ? 'var(--accent-main)' : 'transparent',
                    }}
                  />
                </>
              )}
            </Box>
          ))}
        </Box>
      </CardContainer>

      <SubmitButton month={selectedMonth} person_uid={person_uid} publisher={true} />
    </Stack>
  );
};

export default MonthView;
