import { useAppTranslation } from '@hooks/index';
import useReportStatusFilter from './useReportStatusFilter';
import { ReportStatusFilterOption } from '@definition/cong_field_service_reports';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';

const ReportStatusFilter = () => {
  const { t } = useAppTranslation();

  const { filter, options, handleChangeFilter } = useReportStatusFilter();

  return (
    <Select
      // Ídem: el rótulo dentro del campo, como los otros tres de la fila.
      label={t('tr_reports')}
      value={filter}
      displayEmpty
      onChange={(e) =>
        handleChangeFilter(e.target.value as ReportStatusFilterOption)
      }
    >
      {options.map((option) => (
        <MenuItem key={option.key || 'all'} value={option.key}>
          <Typography>{option.name}</Typography>
        </MenuItem>
      ))}
    </Select>
  );
};

export default ReportStatusFilter;
