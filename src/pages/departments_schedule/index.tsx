import { Box } from '@mui/material';
import { IconPrint } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import PageTitle from '@components/page_title';
import DeptWeekSelector from '@features/departments_schedule/week_selector';
import DepartmentEditor from '@features/departments_schedule/editor';
import useDeptExport from '@features/departments_schedule/useDeptExport';
import NavBarButton from '@components/nav_bar_button';

const DepartmentsSchedule = () => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { handleExportPDF } = useDeptExport();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
      }}
    >
      <PageTitle
        title={t('tr_departmentsSchedule', 'Programa de departamentos')}
        buttons={
          <NavBarButton
            text={t('tr_export', 'Exportar')}
            onClick={handleExportPDF}
            icon={<IconPrint />}
          />
        }
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: desktopUp ? 'row' : 'column',
          gap: '16px',
          alignItems: desktopUp ? 'flex-start' : 'unset',
        }}
      >
        <DeptWeekSelector />
        <DepartmentEditor />
      </Box>
    </Box>
  );
};

export default DepartmentsSchedule;
