import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { IconPrint, IconGenerate, IconPublish } from '@components/icons';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import PageTitle from '@components/page_title';
import DeptWeekPickerPanel from '@features/departments_schedule/week_picker_panel';
import DepartmentEditor from '@features/departments_schedule/editor';
import useDeptExport from '@features/departments_schedule/useDeptExport';
import NavBarButton from '@components/nav_bar_button';
import DeptAutofillDialog from '@features/departments_schedule/autofill';
import { displaySnackNotification } from '@services/states/app';
import {
  deptScheduleState,
  selectedDeptWeekState,
} from '@states/departments_schedule';
import {
  departmentsConfigState,
  pdfExportEnabledState,
} from '@states/settings';
import { DEPT_LABEL, buildAllDeptSlots } from '@services/app/departments_slots';
import { ALL_DEPARTMENT_TYPES } from '@definition/person';
import LastModifiedInfo from '@components/last_modified_info';
import { buildFieldChanges } from '@services/app/last_modified';
import {
  deptMonthNeedsPublishing,
  deptWeeksOfMonth,
  isDeptMonthPublished,
  setDeptMonthPublished,
} from '@services/app/departments_publish';
import { dbDeptScheduleBulkSave } from '@services/dexie/departments_schedule';
import DeptPublishDialog from '@features/departments_schedule/publish_dialog';
import DeptConfigDialog from '@features/departments_schedule/config_dialog';

const DepartmentsSchedule = () => {
  // A esta página solo llega quien edita Departamentos, así que basta con
  // saber si esta cuenta quiere ver los botones de exportar.
  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const departmentsConfig = useAtomValue(departmentsConfigState);
  const schedules = useAtomValue(deptScheduleState);
  const currentSched = schedules.find((s) => s.weekOf === selectedWeek);
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();
  const { handleExportPDF } = useDeptExport();

  const [isAutofillOpen, setIsAutofillOpen] = useState(false);

  // Aquí el «campo» es cada departamento, no cada puesto suelto: las claves de
  // puesto son compuestas ('exterior__midweek', 'exterior__t2') y no se leen.
  // «Acomodadores, el 3 de agosto» sí.
  const changes = useMemo(
    () =>
      buildFieldChanges(
        ALL_DEPARTMENT_TYPES.map((dept) => ({
          label: DEPT_LABEL[dept],
          node: currentSched?.[dept],
        }))
      ),
    [currentSched]
  );

  // Aquí había un botón rotulado "Publicar" que en realidad solo forzaba una
  // sincronización — igual que en Exhibidores y Salidas. Ahora publica de
  // verdad, y el sincronizado va incluido (guardar dispara el ciclo).
  const [publishDialog, setPublishDialog] = useState(false);

  // La configuración vive aquí dentro, no en los ajustes de la congregación:
  // quien lleva los departamentos no tiene por qué tener acceso a aquellos.
  const [configDialog, setConfigDialog] = useState(false);

  // Se publica por MES, aunque los datos sean por semana: es la unidad con la
  // que se piensa el programa. Publicar marca todas las semanas de ese mes.
  const selectedMonth = selectedWeek?.substring(0, 7) ?? '';

  const monthIsPublished = isDeptMonthPublished(schedules, selectedMonth);
  const monthIsHistoric = !deptMonthNeedsPublishing(selectedMonth);

  const weeksInMonth = useMemo(
    () => deptWeeksOfMonth(schedules, selectedMonth),
    [schedules, selectedMonth]
  );

  // Puestos del mes sin nadie asignado. No impide publicar, pero se dice.
  const emptyRolesInMonth = useMemo(() => {
    let count = 0;

    for (const week of weeksInMonth) {
      // Los puestos que hay que contar son los que la configuración de cada
      // departamento define ahora mismo, no una lista escrita a mano: si
      // alguien parte un departamento en dos turnos, los turnos vacíos también
      // cuentan.
      for (const slot of buildAllDeptSlots(departmentsConfig)) {
        if (!week[slot.dept]?.[slot.key]?.value) count++;
      }
    }

    return count;
  }, [weeksInMonth, departmentsConfig]);

  const handleTogglePublishMonth = async () => {
    if (monthIsHistoric) return;

    const toSave = setDeptMonthPublished(
      schedules,
      selectedMonth,
      !monthIsPublished
    );

    // Sin semanas guardadas no hay nada que publicar: un mes vacío no tiene
    // asignaciones que enseñar.
    if (toSave.length === 0) {
      setPublishDialog(false);
      return;
    }

    await dbDeptScheduleBulkSave(toSave);
    setPublishDialog(false);

    displaySnackNotification({
      header: t('tr_done', 'Hecho'),
      message: monthIsPublished
        ? 'Mes retirado: vuelve a ser un borrador.'
        : 'Mes publicado.',
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
        onConfirm={handleTogglePublishMonth}
        isPublished={monthIsPublished}
        month={selectedMonth}
        emptyRoles={emptyRolesInMonth}
        hasSchedule={weeksInMonth.length > 0}
      />

      <DeptConfigDialog
        open={configDialog}
        onClose={() => setConfigDialog(false)}
      />

      {isAutofillOpen && (
        <DeptAutofillDialog
          open={isAutofillOpen}
          onClose={() => setIsAutofillOpen(false)}
        />
      )}

      <PageTitle
        title={t('tr_departmentsSchedule', 'Programa de departamentos')}
        // Al engranaje: ver la nota en `congregation/limpieza`.
        quickSettings={() => setConfigDialog(true)}
        quickSettingsLabel="Configuración de los departamentos"
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
            {!monthIsHistoric && (
              <NavBarButton
                text={monthIsPublished ? 'Publicado' : 'Publicar'}
                main={!monthIsPublished}
                onClick={() => setPublishDialog(true)}
                icon={<IconPublish />}
              />
            )}
          </>
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
        <DeptWeekPickerPanel />
        <DepartmentEditor />
      </Box>

      {/* Al pie: es contexto, no titular. Debajo del título era lo segundo
          que se leía al abrir la página, por delante del programa. */}
      <LastModifiedInfo
        updatedAt={currentSched?.updatedAt}
        lastModifiedBy={currentSched?.lastModifiedBy}
        changes={changes}
      />
    </Box>
  );
};

export default DepartmentsSchedule;
