import useReportStatusFilter from './useReportStatusFilter';
import { ReportStatusFilterOption } from '@definition/cong_field_service_reports';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';

const ReportStatusFilter = () => {
  const { filter, options, handleChangeFilter } = useReportStatusFilter();

  return (
    <Select
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
