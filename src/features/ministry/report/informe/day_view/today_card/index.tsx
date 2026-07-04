import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconChevronLeft, IconChevronRight } from '@components/icons';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';
import DayRowEditor from '../day_row/DayRowEditor';

/**
 * Tarjeta grande del día enfocado (empieza en hoy) — el único editor activo
 * de la vista Día. Reutiliza `DayRowEditor` tal cual (mismos campos que ya
 * usan el panel de Mes), solo con una cabecera grande y flechitas para
 * moverse día a día en vez de tener que desplegar nada. El estado del día
 * enfocado vive en el padre (`DayView`) para que la lista de abajo también
 * pueda moverlo al tocar un día.
 */
const TodayCard = ({
  focusedDateStr,
  weekday,
  monthLabel,
  dayNum,
  isToday,
  handlePrevDay,
  handleNextDay,
  hasExistingReport,
  hoursEnabled,
  summaryHours,
  summaryStudies,
  locked,
}: {
  focusedDateStr: string;
  weekday: string;
  monthLabel: string;
  dayNum: number;
  isToday: boolean;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  hasExistingReport: boolean;
  hoursEnabled: boolean;
  summaryHours: string;
  summaryStudies: number;
  locked: boolean;
}) => {
  const { t } = useAppTranslation();

  return (
    <CardContainer>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ marginBottom: '16px' }}
      >
        <IconButton onClick={handlePrevDay}>
          <IconChevronLeft color="var(--ink)" />
        </IconButton>

        <Stack alignItems="center" spacing="0px">
          <Typography
            className="body-small-semibold"
            color="var(--brand-deep)"
            sx={{ textTransform: 'uppercase' }}
          >
            {isToday ? t('tr_todayLabel', 'Hoy') : weekday}
          </Typography>
          <Typography className="h2" sx={{ fontSize: '36px', lineHeight: 1.1 }}>
            {dayNum}
          </Typography>
          <Typography
            className="body-small-regular"
            color="var(--grey-400)"
            sx={{ textTransform: 'capitalize' }}
          >
            {monthLabel}
          </Typography>
        </Stack>

        <IconButton onClick={handleNextDay}>
          <IconChevronRight color="var(--ink)" />
        </IconButton>
      </Stack>

      {locked ? (
        <Stack spacing="4px" sx={{ textAlign: 'center' }}>
          {hoursEnabled && (
            <Typography className="body-small-semibold">{summaryHours}</Typography>
          )}
          <Typography className="body-small-regular" color="var(--grey-400)">
            {summaryStudies > 0
              ? `${summaryStudies} ${t('tr_individualBibleStudies', 'cursos bíblicos')}`
              : t('tr_noStudiesShort', '—')}
          </Typography>
          <Typography
            className="body-small-regular"
            color="var(--grey-400)"
            sx={{ marginTop: '8px' }}
          >
            {t('tr_monthReportLockedInfo', 'Este mes ya se envió, solo puedes consultarlo')}
          </Typography>
        </Stack>
      ) : (
        <DayRowEditor
          dateStr={focusedDateStr}
          onSaved={() => {}}
          hasExistingReport={hasExistingReport}
        />
      )}
    </CardContainer>
  );
};

export default TodayCard;
