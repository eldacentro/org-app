import { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import Button from '@components/button';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Select from '@components/select';
import MenuItem from '@components/menuitem';
import IconLoading from '@components/icon_loading';
import { deptStartAutofill } from '@services/app/deptAutofill';
import useDeptWeekSelector from '../week_selector/useDeptWeekSelector';
import { getWeekDate, formatDate, dateFormatFriendly } from '@utils/date';

const DeptAutofillDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { t } = useAppTranslation();
  const { tabletUp } = useBreakpoints();
  const { yearsList } = useDeptWeekSelector();

  const [startWeek, setStartWeek] = useState('');
  const [endWeek, setEndWeek] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const allWeeks = useMemo(() => {
    const weeks: { value: string; label: string }[] = [];
    const currentMonday = formatDate(getWeekDate(new Date()), 'yyyy/MM/dd');

    yearsList.forEach((year) => {
      year.months.forEach((month) => {
        month.weeks.forEach((week) => {
          if (week.weekOf >= currentMonday) {
            const label = dateFormatFriendly(week.weekOf);
            weeks.push({ value: week.weekOf, label });
          }
        });
      });
    });
    return weeks;
  }, [yearsList]);

  const endWeeks = useMemo(() => {
    if (!startWeek) return [];
    return allWeeks.filter((w) => w.value >= startWeek);
  }, [allWeeks, startWeek]);

  const handleStartAutoFill = async () => {
    setIsProcessing(true);
    try {
      await deptStartAutofill(startWeek, endWeek);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog onClose={onClose} open={open} sx={{ padding: '24px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography className="h2">{t('tr_autofill', 'Autocompletar')}</Typography>
        <Typography color="var(--grey-400)">
          {t('tr_autofillDesc', 'Selecciona las semanas que deseas autocompletar.')}
        </Typography>
      </Box>

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: tabletUp ? 'row' : 'column',
          gap: '16px',
          my: 2,
        }}
      >
        <Select
          label={t('tr_startWeek', 'Semana de inicio')}
          value={startWeek}
          onChange={(e) => setStartWeek(e.target.value as string)}
        >
          {allWeeks.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Typography className="body-regular">{option.label}</Typography>
            </MenuItem>
          ))}
        </Select>

        <Select
          label={t('tr_endWeek', 'Semana de fin')}
          value={endWeek}
          disabled={!startWeek}
          onChange={(e) => setEndWeek(e.target.value as string)}
        >
          {endWeeks.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Typography className="body-regular">{option.label}</Typography>
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        <Button
          variant="main"
          disabled={isProcessing || !startWeek || !endWeek}
          endIcon={isProcessing && <IconLoading />}
          onClick={handleStartAutoFill}
        >
          {t('tr_autofill', 'Autocompletar')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('tr_cancel', 'Cancelar')}
        </Button>
      </Box>
    </Dialog>
  );
};

export default DeptAutofillDialog;
