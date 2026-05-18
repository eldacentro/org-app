import { Box } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import PageTitle from '@components/page_title';
import DeptWeekSelector from '@features/departments_schedule/week_selector';
import DepartmentEditor from '@features/departments_schedule/editor';

const DepartmentsSchedule = () => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
      }}
    >
      <PageTitle
        title={t('tr_departmentsSchedule', 'Programación Departamentos')}
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
