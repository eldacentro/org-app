import { useMemo, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { dayNamesState, monthNamesState } from '@states/app';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconChevronLeft, IconChevronRight } from '@components/icons';
import IconButton from '@components/icon_button';
import ProgressBarSmall from '@components/progress_bar_small';
import Typography from '@components/typography';
import SubmitButton from '@features/ministry/report/form_S4/submit_button';
import useMonthView from './useMonthView';
import DayPanel from './day_panel';

/**
 * Calendario del mes — sin librería, construido con aritmética simple de
 * fechas (igual que ya hace el resto de la app). Cada celda solo muestra un
 * punto discreto si ese día tiene horas o estudios registrados (no el
 * número exacto, sería demasiado denso). Tocar un día abre el editor justo
 * debajo del calendario (no navega a otra vista); tocarlo de nuevo lo
 * cierra.
 */
const MonthView = () => {
  const { t } = useAppTranslation();
  const dayNames = useAtomValue(dayNamesState);
  const monthNames = useAtomValue(monthNamesState);

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

  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

  const handleDayClick = (dateStr: string) => {
    setSelectedDayStr((prev) => (prev === dateStr ? null : dateStr));
  };

  const selectedDayLabel = useMemo(() => {
    if (!selectedDayStr) return '';
    const date = new Date(selectedDayStr);
    const weekday = dayNames[date.getDay()];
    const capitalWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalWeekday} ${date.getDate()} de ${monthNames[date.getMonth()].toLowerCase()}`;
  }, [selectedDayStr, dayNames, monthNames]);

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

          {cells.map((cell, idx) => {
            const isSelected = cell.dateStr !== '' && cell.dateStr === selectedDayStr;

            return (
              <Box
                key={cell.dateStr || `blank-${idx}`}
                onClick={cell.date ? () => handleDayClick(cell.dateStr) : undefined}
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  borderRadius: 'var(--radius-m, 8px)',
                  cursor: cell.date ? 'pointer' : 'default',
                  backgroundColor: isSelected
                    ? 'var(--brand)'
                    : cell.isToday
                      ? 'var(--brand-tint)'
                      : 'transparent',
                  '&:hover': cell.date ? { backgroundColor: isSelected ? 'var(--brand)' : 'rgba(var(--black-base), 0.04)' } : {},
                }}
              >
                {cell.date && (
                  <>
                    <Typography
                      className="body-small-semibold"
                      color={
                        isSelected
                          ? 'var(--always-white)'
                          : cell.isToday
                            ? 'var(--brand-deep)'
                            : 'var(--ink)'
                      }
                    >
                      {cell.dayNum}
                    </Typography>
                    <Box
                      sx={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: cell.hasRecord
                          ? isSelected
                            ? 'var(--always-white)'
                            : 'var(--accent-main)'
                          : 'transparent',
                      }}
                    />
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </CardContainer>

      {selectedDayStr && (
        <DayPanel
          dateStr={selectedDayStr}
          label={selectedDayLabel}
          onClose={() => setSelectedDayStr(null)}
        />
      )}

      <SubmitButton month={selectedMonth} person_uid={person_uid} publisher={true} />
    </Stack>
  );
};

export default MonthView;
