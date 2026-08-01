import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import {
  CardSection,
  CardSectionContent,
  CardSectionHeader,
} from '../shared_styles';
import { congNameState } from '@states/settings';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { TemplateAccesos } from '@views/index';
import { diaArchivo, nombreArchivo } from '@utils/nombre_pdf';
import Button from '@components/button';
import { IconPrint } from '@components/icons';

/**
 * Exportar «Quién ve qué en la aplicación».
 *
 * Vive en Ajustes de la congregación y no en una página propia porque no es
 * una herramienta de trabajo: es un documento que un anciano saca una vez, lo
 * repasa con el cuerpo de ancianos y no vuelve a tocar hasta que alguien
 * pregunte.
 *
 * El nombre del archivo lleva el DÍA, no el mes: el cuadro describe cómo está
 * la aplicación hoy, y si mañana cambia una comprobación de acceso deja de ser
 * cierto.
 */
const AccesosExport = () => {
  const congName = useAtomValue(congNameState);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleExportPDF = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      const blob = await pdf(<TemplateAccesos congregation={congName} />).toBlob();

      saveAs(
        blob,
        nombreArchivo('Quién ve qué en la aplicación', diaArchivo(new Date()))
      );
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error?.message || 'error_app_generic-desc'),
        severity: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Va en `CardSection` como sus hermanas de esta página. Suelto sobre el
  // fondo era la única pieza sin tarjeta y se notaba a la legua.
  return (
    <CardSection>
      <CardSectionHeader
        title="Quién ve qué en la aplicación"
        description="Un cuadro con lo que puede abrir cada hermano según sus encargos, para repasarlo con el cuerpo de ancianos."
      />

      <CardSectionContent>
        <Button
          variant="secondary"
          startIcon={<IconPrint />}
          onClick={handleExportPDF}
          disabled={isProcessing}
          sx={{ alignSelf: 'flex-start' }}
        >
          Exportar
        </Button>
      </CardSectionContent>
    </CardSection>
  );
};

export default AccesosExport;
