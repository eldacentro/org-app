import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { saveAs } from 'file-saver';
import { displaySnackNotification } from '@services/states/app';
import { ExportType } from './index.types';
import { getMessageByCode } from '@services/i18n/translation';
import { congIDState } from '@states/settings';
import { generateBackupPayload } from '@services/app/backupScheduler';
import { formatDate } from '@utils/date';

/**
 * Descargar la copia de seguridad a un archivo.
 *
 * Aquí ya no se monta nada: se pide la copia a `generateBackupPayload`, que es
 * la misma que usan Drive y las copias locales.
 *
 * Antes esto tenía su propia lista de tablas, y esa era toda la avería: había
 * DOS generadores de copia y cada uno se dejaba fuera cosas distintas. Este no
 * traía territorios —viven en Firestore, y aquí se leían de unas tablas locales
 * que no las escribe nadie, así que salían ocho listas vacías— y el otro no
 * traía Exhibidores, Salidas, Departamentos, responsabilidades, visitas del
 * superintendente ni los ajustes de discursos y canciones. Según por dónde se
 * guardara, la copia era una u otra, y las dos parecían completas.
 */
const useExport = ({ onClose }: ExportType) => {
  const congId = useAtomValue(congIDState);

  const [isProcessing, setIsProcessing] = useState(false);

  const filename = useMemo(() => {
    const now = formatDate(new Date(), 'yyyy-MM-dd_HH:mm:ss').replace('_', 'T');

    return `EldaCentro-backup-${now}.json`;
  }, []);

  const handleDownload = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      // Con `congId`: sin él, la copia se salta TODO lo de territorios (zonas,
      // territorios, asignaciones, direcciones, campañas, solicitudes, avisos,
      // etiquetas y ajustes), que vive en Firestore y hay que ir a buscarlo.
      const payload = await generateBackupPayload(congId || undefined);

      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });

      saveAs(blob, filename);

      // Si había congregación y aun así no vienen, es que el servidor no
      // contestó. La copia vale igual —lleva todo lo demás— pero hay que
      // decirlo: una copia sin territorios que parece completa es peor que no
      // tenerla, porque nadie la revisa hasta que hace falta.
      if (congId && !payload?.data?.territories) {
        displaySnackNotification({
          severity: 'error',
          header: 'La copia se ha descargado sin los territorios',
          message:
            'No se pudo leer Territorios del servidor. El resto de los datos sí están. Comprueba la conexión y vuelve a descargarla.',
        });
      }

      onClose?.();

      setIsProcessing(false);
    } catch (error) {
      setIsProcessing(false);

      console.error(error);

      displaySnackNotification({
        severity: 'error',
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
      });
    }
  };

  return { filename, isProcessing, handleDownload };
};

export default useExport;
