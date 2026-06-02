import { useState } from 'react';
import { Box } from '@mui/material';
import { IconPrint, IconGenerate, IconPublish } from '@components/icons';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import PageTitle from '@components/page_title';
import DeptWeekSelector from '@features/departments_schedule/week_selector';
import DepartmentEditor from '@features/departments_schedule/editor';
import useDeptExport from '@features/departments_schedule/useDeptExport';
import NavBarButton from '@components/nav_bar_button';
import DeptAutofillDialog from '@features/departments_schedule/autofill';
import worker from '@services/worker/backupWorker';
import { displaySnackNotification } from '@services/states/app';
import { deptScheduleState, selectedDeptWeekState } from '@states/departments_schedule';
import { pdfExportEnabledState } from '@states/settings';
import LastModifiedInfo from '@components/last_modified_info';

const DepartmentsSchedule = () => {
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const schedules = useAtomValue(deptScheduleState);
  const currentSched = schedules.find((s) => s.weekOf === selectedWeek);
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { handleExportPDF } = useDeptExport();

  const [isAutofillOpen, setIsAutofillOpen] = useState(false);

  const handleForceSync = () => {
    worker.postMessage('startWorker');

    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: t('tr_syncInProgress', 'Sincronización en curso...'),
      severity: 'success',
    });
  };
  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
      }}
    >
      {isAutofillOpen && (
        <DeptAutofillDialog
          open={isAutofillOpen}
          onClose={() => setIsAutofillOpen(false)}
        />
      )}

      <PageTitle
        title={t('tr_departmentsSchedule', 'Programa de departamentos')}
        buttons={
          <>
            {pdfExportEnabled && (
              <NavBarButton
                text={t('tr_export', 'Exportar')}
                onClick={handleExportPDF}
                icon={<IconPrint />}
              />
            )}
            <NavBarButton
              text={t('tr_autofill', 'Autocompletar')}
              onClick={() => setIsAutofillOpen(true)}
              icon={<IconGenerate />}
            />
            <NavBarButton
              text={t('tr_publish', 'Publicar')}
              main
              onClick={handleForceSync}
              icon={<IconPublish />}
            />
          </>
        }
      />

      <LastModifiedInfo updatedAt={currentSched?.updatedAt} lastModifiedBy={currentSched?.lastModifiedBy} />

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
