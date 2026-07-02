import { Box } from '@mui/material';
import { IconDelete } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { DatePicker } from '@components/index';
import { WeekItemType } from './index.types';
import useWeekItem from './useWeekItem';
import useIsCircuitVisitManager from '@features/circuit_visit/useIsCircuitVisitManager';
import IconButton from '@components/icon_button';
import { addDays, formatDate, getWeekDate } from '@utils/date';

const WeekItem = ({ visit, error, helperText, onWeekChange, onDelete }: WeekItemType) => {
  const { t } = useAppTranslation();

  const canEdit = useIsCircuitVisitManager();

  const { handleDateChange, handleDeleteVisit } = useWeekItem(visit);

  const computeWeekOf = (date: Date | null) => {
    if (date === null) {
      return '';
    }

    return formatDate(getWeekDate(date), 'yyyy/MM/dd');
  };

  const handlePickerChange = async (date: Date | null) => {
    const optimisticWeekOf = computeWeekOf(date);

    if (onWeekChange) {
      onWeekChange(visit.id, optimisticWeekOf);
    }

    try {
      const nextWeekOf = await handleDateChange(date);

      if (onWeekChange && nextWeekOf !== optimisticWeekOf) {
        onWeekChange(visit.id, nextWeekOf);
      }
    } catch (error) {
      if (onWeekChange) {
        onWeekChange(visit.id, visit.weekOf);
      }

      console.error(error);
    }
  };

  const handleDeleteClick = async () => {
    await handleDeleteVisit();

    if (onDelete) {
      onDelete(visit.id);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: '16px' }}>
      <DatePicker
        disablePast
        label={t('tr_coNextVisitWeek')}
        // weekOf guarda el lunes de la semana (convención interna); se
        // muestra/selecciona el martes, que es el día real en que arranca
        // la visita — computeWeekOf() vuelve a derivar el lunes al elegir.
        value={visit.weekOf === '' ? null : addDays(new Date(visit.weekOf), 1)}
        onChange={handlePickerChange}
        readOnly={!canEdit}
        error={error}
        helperText={helperText ?? 'Las visitas siempre empiezan en martes'}
        shouldDisableDate={(date) => date.getDay() !== 2}
      />

      {canEdit && (
        <IconButton
          color="error"
          sx={{
            borderRadius: 'var(--radius-m)',
            width: '48px',
            height: '48px',
          }}
          onClick={handleDeleteClick}
        >
          <IconDelete color="var(--red-main)" />
        </IconButton>
      )}
    </Box>
  );
};

export default WeekItem;
