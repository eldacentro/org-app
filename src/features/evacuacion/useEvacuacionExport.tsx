import { useCallback, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { useAtomValue } from 'jotai';
import { congNameState } from '@states/settings';
import { PlanEvacuacion } from '@definition/evacuacion';
import { nombreArchivo } from '@utils/nombre_pdf';
import { displaySnackNotification } from '@services/states/app';

/**
 * Exportar el plan de evacuación a PDF.
 *
 * El plano se rasteriza ANTES de montar el documento y se le pasa ya hecho:
 * `pdf()` no espera a promesas de dentro del árbol, así que un `<Image>` que
 * todavía se está dibujando sale en blanco y sin ningún error.
 *
 * Tanto el rasterizador como la plantilla se cargan a demanda: son el plano
 * entero más `react-dom/server`, y no tienen por qué viajar en el arranque de
 * la app para quien nunca pulsa Exportar.
 */
const useEvacuacionExport = (plan: PlanEvacuacion) => {
  const congName = useAtomValue(congNameState);
  const [exportando, setExportando] = useState(false);

  const handleExportPDF = useCallback(async () => {
    setExportando(true);

    try {
      const [{ planoComoPng }, { default: EvacuacionPDF }] = await Promise.all([
        import('./planoImagen'),
        import('@views/congregation/evacuacion'),
      ]);

      const plano = await planoComoPng(532);

      const blob = await pdf(
        <EvacuacionPDF plan={plan} cong_name={congName} plano={plano} />
      ).toBlob();

      saveAs(blob, nombreArchivo('Plan de evacuación'));
    } catch (error) {
      console.error('Error generando el PDF del plan de evacuación:', error);
      displaySnackNotification({
        header: 'No se ha podido crear el PDF',
        message: 'Vuelve a intentarlo en un momento.',
        severity: 'error',
      });
    } finally {
      setExportando(false);
    }
  }, [plan, congName]);

  return { handleExportPDF, exportando };
};

export default useEvacuacionExport;
