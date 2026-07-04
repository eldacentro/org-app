import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { deptScheduleState, selectedDeptWeekState } from '@states/departments_schedule';
import { personGetFullname } from '@services/states/persons';
import { congNameState } from '@states/settings';
import { formatDateShortMonth, weeksInMonth } from '@utils/date';
import DeptSchedulePDF, { DeptPDFData } from '@views/departments';

const useDeptExport = () => {
  const selectedWeek = useAtomValue(selectedDeptWeekState);
  const deptSchedules = useAtomValue(deptScheduleState);
  const congName = useAtomValue(congNameState);

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

      // Si la persona ya no existe (se borró), se usa el nombre que ya se
      // guardó junto con el uid al momento de asignar, en vez de dejar la
      // celda en blanco sin ningún rastro de quién estaba asignado.
      return {
        weekOf,
        weekOfFormatted: weekLabel,
        acomodadores: {
          exterior:
            personGetFullname(week?.acomodadores.exterior.value || '') ||
            week?.acomodadores.exterior.name ||
            '',
          interior:
            personGetFullname(week?.acomodadores.interior.value || '') ||
            week?.acomodadores.interior.name ||
            '',
        },
        microfonos: {
          micro1:
            personGetFullname(week?.microfonos.micro1.value || '') ||
            week?.microfonos.micro1.name ||
            '',
          micro2:
            personGetFullname(week?.microfonos.micro2.value || '') ||
            week?.microfonos.micro2.name ||
            '',
        },
        multimedia: {
          video:
            personGetFullname(week?.multimedia.video.value || '') ||
            week?.multimedia.video.name ||
            '',
          audio:
            personGetFullname(week?.multimedia.audio.value || '') ||
            week?.multimedia.audio.name ||
            '',
        },
        updatedAt: week?.updatedAt,
        lastModifiedBy: week?.lastModifiedBy,
        plataforma: {
          encargado:
            personGetFullname(week?.plataforma.encargado.value || '') ||
            week?.plataforma.encargado.name ||
            '',
        },
      };
    });

    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
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
  }, [selectedWeek, deptSchedules, congName]);

  return { handleExportPDF };
};

export default useDeptExport;
