import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { displaySnackNotification } from '@services/states/app';

export const generateAndSharePdf = async (
  document: React.ReactElement,
  fileName: string,
  t: (key: string, defaultValue?: string) => string
) => {
  try {
    const blob = await pdf(document).toBlob();
    const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: fileName,
        text: 'Aquí tienes tu invitación para el discurso público.',
      });
      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'Invitación compartida exitosamente.',
        severity: 'success',
      });
    } else {
      // Fallback: Download the file and tell the user
      saveAs(blob, `${fileName}.pdf`);
      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: 'El navegador no soporta compartir archivos directamente. El PDF ha sido descargado.',
        severity: 'success',
      });
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error generating or sharing PDF:', error);
      displaySnackNotification({
        header: 'Error',
        message: 'Hubo un error al generar la invitación.',
        severity: 'error',
      });
    }
  }
};
