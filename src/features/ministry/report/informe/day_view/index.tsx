import { useRef, useState } from 'react';
import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconArrowDown, IconChevronLeft, IconChevronRight } from '@components/icons';
import IconButton from '@components/icon_button';
import ProgressBarSmall from '@components/progress_bar_small';
import Typography from '@components/typography';
import SubmitButton from '@features/ministry/report/form_S4/submit_button';
import useMonthView from '../month_view/useMonthView';
import useTodayCard from './today_card/useTodayCard';
import TodayCard from './today_card';
import DayRow from './day_row';

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

  const {
    focusedDateStr,
    focusDate,
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

  const [showAllDays, setShowAllDays] = useState(false);

  const dayCells = cells.filter((cell) => cell.date);

  const handleSelectDay = (dateStr: string) => {
    focusDate(dateStr);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Stack spacing="12px">
      <div ref={topRef} />

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

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => setShowAllDays((prev) => !prev)}
        sx={{
          cursor: 'pointer',
          padding: '4px 4px',
        }}
      >
        <Typography className="body-small-semibold" color="var(--grey-400)">
          {t('tr_allMonthDays', 'Todos los días')}
        </Typography>
        <IconArrowDown
          color="var(--grey-350)"
          sx={{
            transition: 'transform 0.2s ease',
            transform: showAllDays ? 'rotate(180deg)' : 'none',
          }}
        />
      </Stack>

      {showAllDays && (
        <Stack spacing="8px">
          {dayCells.map((cell) => (
            <DayRow key={cell.dateStr} cell={cell} onSelect={handleSelectDay} />
          ))}
        </Stack>
      )}

      <SubmitButton month={selectedMonth} person_uid={person_uid} publisher={true} />
    </Stack>
  );
};

export default DayView;
