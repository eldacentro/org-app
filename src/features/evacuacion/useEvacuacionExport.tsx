import { useCallback, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { useAtomValue } from 'jotai';
import { congNameState } from '@states/settings';
import { PlanEvacuacion } from '@definition/evacuacion';
import { nombreArchivo } from '@utils/nombre_pdf';
import { displaySnackNotification } from '@services/states/app';

/**
 * A qué RESOLUCIÓN se rasteriza el plano, en puntos de ancho.
 *
 * Ya no decide lo que ocupa en la hoja —de eso se encarga el `flexGrow` de la
 * tarjeta, que le da lo que sobre—, solo cuántos píxeles tiene el PNG. 532 es
 * el ancho útil de un A4 vertical con el margen del modo compacto: se genera a
 * su tamaño máximo posible y luego la hoja lo encoge si hace falta, que es el
 * orden correcto. Al revés se vería pastoso.
 */
const ANCHO_PLANO = 532;

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

      const plano = await planoComoPng(ANCHO_PLANO);

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
