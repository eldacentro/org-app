import { Box } from '@mui/material';
import DateHistory from '@features/persons/date_history';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';
import { useAppTranslation } from '@hooks/index';
import { EnrollmentItemType } from './index.types';

const EnrollmentItem = ({
  id,
  end_date,
  isLast,
  onAdd,
  onDelete,
  onEndDateChange,
  onStartDateChange,
  start_date,
  enrollment,
  onEnrollmentChange,
  readOnly,
}: EnrollmentItemType) => {
  const { t } = useAppTranslation();

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <Select
        className="body-regular"
        label={t('tr_enrollment')}
        value={enrollment}
        onChange={(e) => onEnrollmentChange(id, e.target.value as string)}
        readOnly={readOnly}
      >
        <MenuItem value="AP">
          <Typography>{t('tr_AP')}</Typography>
        </MenuItem>
        <MenuItem value="FR">
          <Typography>{t('tr_FR')}</Typography>
        </MenuItem>
        <MenuItem value="FS">
          <Typography>{t('tr_FS')}</Typography>
        </MenuItem>
        <MenuItem value="FMF">
          <Typography>{t('tr_FMF')}</Typography>
        </MenuItem>
      </Select>

      <DateHistory
        id={id}
        readOnly={readOnly}
        start_date={start_date}
        end_date={end_date}
        isLast={isLast}
        onAdd={onAdd}
        onDelete={onDelete}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      {end_date === null && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--green-secondary)',
            alignSelf: 'flex-start',
          }}
        >
          <Typography
            className="label-small-semibold"
            color="var(--green-main)"
          >
            De continuo
          </Typography>
          <Typography className="label-small-regular" color="var(--grey-400)">
            {enrollment === 'AP'
              ? '— precursor auxiliar cada mes (meta 30 h, o 15 h en meses especiales) hasta poner fecha de fin'
              : '— vigente sin fecha de fin'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EnrollmentItem;
