import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Informe from '@features/ministry/report/informe';
import PageTitle from '@components/page_title';

const MinistryReport = () => {
  const { t } = useAppTranslation();

  return (
    <Box sx={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
      <PageTitle title={t('tr_report')} />

      <Informe />
    </Box>
  );
};

export default MinistryReport;
