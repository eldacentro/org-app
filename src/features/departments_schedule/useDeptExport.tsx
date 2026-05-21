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

      return {
        weekOf,
        weekOfFormatted: weekLabel,
        acomodadores: {
          exterior: personGetFullname(week?.acomodadores.exterior.value || ''),
          interior: personGetFullname(week?.acomodadores.interior.value || ''),
        },
        microfonos: {
          micro1: personGetFullname(week?.microfonos.micro1.value || ''),
          micro2: personGetFullname(week?.microfonos.micro2.value || ''),
        },
        multimedia: {
          video: personGetFullname(week?.multimedia.video.value || ''),
          audio: personGetFullname(week?.multimedia.audio.value || ''),
        },
        updatedAt: week?.updatedAt,
        lastModifiedBy: week?.lastModifiedBy,
        plataforma: {
          encargado: personGetFullname(week?.plataforma.encargado.value || ''),
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
      console.log('Generating PDF for month:', monthName, year);
      console.log('PDF Data:', data);
      
      const doc = (
        <DeptSchedulePDF
          data={data}
          monthName={`${monthName} ${year}`}
          cong_name={congName}
        />
      );

      console.log('PDF Document created, rendering...');
      const blob = await pdf(doc).toBlob();
      console.log('PDF Blob generated successfully:', blob.size, 'bytes');
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [selectedWeek, deptSchedules, congName]);

  return { handleExportPDF };
};

export default useDeptExport;
