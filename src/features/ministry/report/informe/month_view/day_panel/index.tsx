import { Stack } from '@mui/material';
import { CardContainer } from '@features/ministry/shared_styles';
import { IconClose } from '@components/icons';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';
import useDayPanel from './useDayPanel';
import DayRowEditor from '../../day_view/day_row/DayRowEditor';

/**
 * Se abre debajo del calendario al tocar un día — mismo editor que usan
 * la tarjeta de Día y las filas de la lista, así que si el día ya tenía
 * datos aparecen precargados y editables tal cual.
 */
const DayPanel = ({
  dateStr,
  label,
  onClose,
}: {
  dateStr: string;
  label: string;
  onClose: () => void;
}) => {
  const { hasExistingReport } = useDayPanel(dateStr);

  return (
    <CardContainer>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ marginBottom: '12px' }}
      >
        <Typography className="h3" sx={{ textTransform: 'capitalize' }}>
          {label}
        </Typography>
        <IconButton onClick={onClose}>
          <IconClose color="var(--grey-350)" />
        </IconButton>
      </Stack>

      <DayRowEditor dateStr={dateStr} onSaved={onClose} hasExistingReport={hasExistingReport} />
    </CardContainer>
  );
};

export default DayPanel;
