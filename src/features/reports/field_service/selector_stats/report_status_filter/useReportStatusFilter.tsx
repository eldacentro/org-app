import { useAtom } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { reportStatusFilterFieldServiceReportState } from '@states/field_service_reports';
import { ReportStatusFilterOption } from '@definition/cong_field_service_reports';

const useReportStatusFilter = () => {
  const { t } = useAppTranslation();

  const [filter, setFilter] = useAtom(reportStatusFilterFieldServiceReportState);

  const options = [
    { key: '' as ReportStatusFilterOption, name: t('tr_allReportStatuses') },
    { key: 'not_submitted' as ReportStatusFilterOption, name: t('tr_reportNotSubmitted') },
    { key: 'unverified' as ReportStatusFilterOption, name: t('tr_reportUnverified') },
    { key: 'verified' as ReportStatusFilterOption, name: t('tr_reportVerified') },
  ];

  const handleChangeFilter = (value: ReportStatusFilterOption) => setFilter(value);

  return { filter, options, handleChangeFilter };
};

export default useReportStatusFilter;
