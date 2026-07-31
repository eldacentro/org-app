import { useCallback } from 'react';
import { MESES_ES } from '@utils/nombres_fecha';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import {
  deptScheduleState,
  selectedDeptWeekState,
} from '@states/departments_schedule';
import { personGetFullname } from '@services/states/persons';
import { congNameState, departmentsConfigState } from '@states/settings';
import { buildDeptSlots, DEPT_LABEL } from '@services/app/departments_slots';
import { DepartmentType } from '@definition/person';
import { formatDateShortMonth, weeksInMonth } from '@utils/date';
import DeptSchedulePDF, { DeptPDFData } from '@views/departments';

const useDeptExport = () => {
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const deptSchedules = useAtomValue(deptScheduleState);
  const congName = useAtomValue(congNameState);
  const departmentsConfig = useAtomValue(departmentsConfigState);

  const handleExportPDF = useCallback(async () => {
    if (selectedWeek === '') return;

    const [year, month] = selectedWeek.split('/');
    const monthKey = `${year}/${month}`;

    // Get all weeks of the selected month
    const allMonthWeeks = weeksInMonth(monthKey);

    const data: DeptPDFData[] = allMonthWeeks.map((weekOf) => {
      const week = deptSchedules.find((s) => s?.weekOf === weekOf);
      const monday = new Date(weekOf);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const weekLabel = `${formatDateShortMonth(monday)} - ${formatDateShortMonth(sunday)}`;

      // Los puestos salen de la configuración de cada departamento (por semana
      // o por reunión, con uno o dos turnos), no de una lista escrita a mano.
      const departments = (Object.keys(DEPT_LABEL) as DepartmentType[]).map(
        (dept) => ({
          title: DEPT_LABEL[dept],
          rows: buildDeptSlots(departmentsConfig, dept).map((slot) => {
            const assignment = week?.[dept]?.[slot.key];

            // Si la persona ya no existe (se borró), se usa el nombre que ya se
            // guardó junto con el uid al momento de asignar, en vez de dejar la
            // celda en blanco sin ningún rastro de quién estaba asignado.
            return {
              label: slot.label,
              name:
                personGetFullname(assignment?.value || '') ||
                assignment?.name ||
                '',
            };
          }),
        })
      );

      return {
        weekOf,
        weekOfFormatted: weekLabel,
        departments,
        updatedAt: week?.updatedAt,
        lastModifiedBy: week?.lastModifiedBy,
      };
    });

    const meses = [...MESES_ES];
    const monthIndex = parseInt(month) - 1;
    const monthName = meses[monthIndex];
    const fileName = `Departamentos_${monthName}_${year}.pdf`;

    try {
      const doc = (
        <DeptSchedulePDF
          data={data}
          monthName={`${monthName} ${year}`}
          cong_name={congName}
        />
      );

      const blob = await pdf(doc).toBlob();
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [selectedWeek, deptSchedules, congName, departmentsConfig]);

  return { handleExportPDF };
};

export default useDeptExport;
