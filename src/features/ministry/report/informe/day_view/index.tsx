import { useRef } from 'react';
import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconChevronLeft, IconChevronRight } from '@components/icons';
import IconButton from '@components/icon_button';
import ProgressBarSmall from '@components/progress_bar_small';
import Typography from '@components/typography';
import SubmitBlock from '../submit_block';
import useMonthView from '../month_view/useMonthView';
import useTodayCard from './today_card/useTodayCard';
import TodayCard from './today_card';

/**
 * Tarjeta grande del día enfocado (empieza en hoy, con flechitas para ir
 * día a día) arriba — el único editor de la vista. Debajo, la lista de
 * todos los días del mes queda colapsada por defecto, como acceso rápido
 * de solo resumen: tocar un día ahí mueve el foco de la tarjeta de arriba
 * en vez de abrir un segundo editor (evita que dos editores compitan por
 * el mismo borrador compartido).
 */
const DayView = () => {
  const { t } = useAppTranslation();
  const topRef = useRef<HTMLDivElement>(null);

  const {
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

  const {
    focusedDateStr,
    weekday,
    monthLabel: focusedMonthLabel,
    dayNum,
    isToday,
    handlePrevDay,
    handleNextDay,
    hasExistingReport,
    hoursEnabled,
    summaryHours,
    summaryStudies,
  } = useTodayCard();

  return (
    <Stack spacing="12px" ref={topRef}>
      <TodayCard
        focusedDateStr={focusedDateStr}
        weekday={weekday}
        monthLabel={focusedMonthLabel}
        dayNum={dayNum}
        isToday={isToday}
        handlePrevDay={handlePrevDay}
        handleNextDay={handleNextDay}
        hasExistingReport={hasExistingReport}
        hoursEnabled={hoursEnabled}
        summaryHours={summaryHours}
        summaryStudies={summaryStudies}
        locked={locked}
      />

      <CardContainer>
        {goal !== undefined && (
          <Stack spacing="6px" sx={{ marginBottom: '4px' }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                className="body-small-semibold"
                color="var(--grey-400)"
              >
                {t('tr_hours', 'Horas')}
              </Typography>
              <Typography className="body-small-semibold">
                {hours_total} / {goal}h
              </Typography>
            </Stack>
            <ProgressBarSmall value={hoursValue} maxValue={goal} />
          </Stack>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <IconButton aria-label="Mes anterior" onClick={goToPreviousMonth}>
            <IconChevronLeft color="var(--ink)" />
          </IconButton>
          <Typography className="h3">{monthLabel}</Typography>
          <IconButton aria-label="Mes siguiente" onClick={goToNextMonth}>
            <IconChevronRight color="var(--ink)" />
          </IconButton>
        </Stack>

        {locked && (
          <Typography
            className="body-small-regular"
            color="var(--grey-400)"
            sx={{ textAlign: 'center', marginTop: '8px' }}
          >
            {t(
              'tr_monthReportLockedInfo',
              'Este mes ya se envió, solo puedes consultarlo'
            )}
          </Typography>
        )}
      </CardContainer>

      {/* Aquí iba un plegable de "Todos los días" con la lista del mes
          entera. Se va: para ver el mes de un vistazo está la vista de Mes,
          que es exactamente eso y con más sitio. Aquí solo servía para meter
          una segunda lista justo encima del botón de enviar, pegada a él. */}
      <SubmitBlock month={selectedMonth} person_uid={person_uid} />
    </Stack>
  );
};

export default DayView;
