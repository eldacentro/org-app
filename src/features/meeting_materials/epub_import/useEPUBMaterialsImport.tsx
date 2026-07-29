import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { epubFileState, isImportEPUBState } from '@states/sources';
import { setEpubFile, setIsImportEPUB } from '@services/states/sources';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { sourcesImportEPUB } from '@services/app/sources';

const useEPUBMaterialsImport = () => {
  const { t } = useAppTranslation();

  const isOpen = useAtomValue(isImportEPUBState);
  const epubFile = useAtomValue(epubFileState);

  const [isCompleted, setIsCompleted] = useState(false);

  // Qué trajo de verdad el archivo. Sin esto, importar el .jwpub equivocado y
  // el correcto se ven igual: "Importado correctamente" y a callar.
  const [resumen, setResumen] = useState('');

  const handleClose = () => setIsImportEPUB(false);

  useEffect(() => {
    const handleRunImport = async () => {
      try {
        if (epubFile) {
          const result = await sourcesImportEPUB(epubFile);

          const partes: string[] = [];

          if (result.midweek > 0) {
            partes.push(
              `${result.midweek} ${result.midweek === 1 ? 'semana' : 'semanas'} de la Guía de actividades`
            );
          }

          if (result.weekend > 0) {
            partes.push(
              `${result.weekend} ${result.weekend === 1 ? 'semana' : 'semanas'} de La Atalaya`
            );
          }

          setResumen(
            partes.length > 0
              ? `${partes.join(' y ')}.`
              : 'El archivo no traía semanas que la aplicación pueda leer. Comprueba que es la Guía de actividades o La Atalaya de estudio, en el idioma de la congregación.'
          );

          setEpubFile(null);
          setIsCompleted(true);
        }
      } catch (error) {
        setEpubFile(null);
        setIsImportEPUB(false);

        displaySnackNotification({
          header: getMessageByCode('error_app_generic-title'),
          message: getMessageByCode(error.message),
          severity: 'error',
        });
      }
    };

    handleRunImport();
  }, [t, epubFile]);

  return { isOpen, handleClose, isCompleted, resumen };
};

export default useEPUBMaterialsImport;
