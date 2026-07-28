import { useMemo, useState } from 'react';
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
import { displaySnackNotification } from '@services/states/app';
import { deptScheduleState, selectedDeptWeekState } from '@states/departments_schedule';
import { pdfExportEnabledState } from '@states/settings';
import LastModifiedInfo from '@components/last_modified_info';
import {
  deptWeekNeedsPublishing,
  isDeptWeekPublished,
} from '@services/app/departments_publish';
import { dbDeptScheduleSave } from '@services/dexie/departments_schedule';
import DeptPublishDialog from '@features/departments_schedule/publish_dialog';

const DepartmentsSchedule = () => {
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const schedules = useAtomValue(deptScheduleState);
  const currentSched = schedules.find((s) => s.weekOf === selectedWeek);
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { handleExportPDF } = useDeptExport();

  const [isAutofillOpen, setIsAutofillOpen] = useState(false);

  // Aquí había un botón rotulado "Publicar" que en realidad solo forzaba una
  // sincronización — igual que en Exhibidores y Salidas. Ahora publica de
  // verdad, y el sincronizado va incluido (guardar dispara el ciclo).
  const [publishDialog, setPublishDialog] = useState(false);

  const weekIsPublished = isDeptWeekPublished(currentSched);
  const weekIsHistoric = !deptWeekNeedsPublishing(selectedWeek);

  // Puestos del programa sin nadie asignado. No impide publicar, pero se dice.
  const emptyRolesInWeek = useMemo(() => {
    if (!currentSched) return 0;

    const roles = [
      currentSched.acomodadores?.exterior,
      currentSched.acomodadores?.interior,
      currentSched.microfonos?.micro1,
      currentSched.microfonos?.micro2,
      currentSched.multimedia?.video,
      currentSched.multimedia?.audio,
      currentSched.plataforma?.encargado,
    ];

    return roles.filter((role) => !role?.value).length;
  }, [currentSched]);

  const handleTogglePublishWeek = async () => {
    if (weekIsHistoric) return;

    // Sin registro no hay nada que publicar: una semana vacía no tiene
    // asignaciones que enseñar.
    if (!currentSched) {
      setPublishDialog(false);
      return;
    }

    const updated = structuredClone(currentSched);
    updated.published = !weekIsPublished;

    await dbDeptScheduleSave(updated);
    setPublishDialog(false);

    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: updated.published
        ? 'Semana publicada.'
        : 'Semana retirada: vuelve a ser un borrador.',
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
      <DeptPublishDialog
        open={publishDialog}
        onClose={() => setPublishDialog(false)}
        onConfirm={handleTogglePublishWeek}
        isPublished={weekIsPublished}
        weekOf={selectedWeek}
        emptyRoles={emptyRolesInWeek}
        hasSchedule={Boolean(currentSched)}
      />

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
            {!weekIsHistoric && (
              <NavBarButton
                text={weekIsPublished ? 'Publicada' : 'Publicar semana'}
                main={!weekIsPublished}
                onClick={() => setPublishDialog(true)}
                icon={<IconPublish />}
              />
            )}
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
