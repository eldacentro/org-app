import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import {
  purgedOnRestore,
  restorePersonFromTrash,
  TrashEntry,
} from '@services/app/persons_trash';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { IconCheckCircle, IconError } from '@components/icons';
import { fieldServiceReportsState } from '@states/field_service_reports';

const useTrashCard = (entry: TrashEntry) => {
  const { t } = useAppTranslation();

  const reports = useAtomValue(fieldServiceReportsState);

  const [isRestoring, setIsRestoring] = useState(false);

  /**
   * Lo que la norma de conservación se llevaría EN CUANTO vuelva.
   *
   * Mientras está en la papelera, `retention.ts` se salta a esta persona y sus
   * informes quedan congelados. Al devolverla vuelve a caer bajo la norma, y a
   * un publicador inactivo la norma solo le conserva el año de servicio de sus
   * últimos informes: la comprobación diaria del día siguiente se llevaría el
   * resto. Se calcula antes para poder decirlo, no después para lamentarlo.
   *
   * Solo cuando el diálogo está abierto: recorrer todos los informes por cada
   * ficha de la papelera, y en cada cambio de la tabla, no lo paga nadie.
   */
  const atRisk = useMemo(() => {
    if (!isRestoring) return { reports: 0, enrollments: 0 };

    return purgedOnRestore(entry.person, reports);
  }, [isRestoring, entry.person, reports]);

  const handleOpen = () => setIsRestoring(true);

  const handleClose = () => setIsRestoring(false);

  const handleConfirm = async () => {
    try {
      // Por IDENTIFICADOR. Nunca por nombre: el de un hermano aparece dentro
      // de los registros de otros, y aquí devolver a quien no toca sería el
      // fallo que esta pantalla existe para no cometer.
      const result = await restorePersonFromTrash(entry.person.person_uid);

      setIsRestoring(false);

      displaySnackNotification({
        header: t('tr_personRestored'),
        message: (() => {
          if (result.reportsRestored === 0) return t('tr_personRestoredDesc');

          if (result.reportsRestored === 1)
            return t('tr_personRestoredWithReportsOne');

          return t('tr_personRestoredWithReports', {
            count: result.reportsRestored,
          });
        })(),
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });
    } catch (error) {
      setIsRestoring(false);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: error.message,
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    }
  };

  return {
    isRestoring,
    handleOpen,
    handleClose,
    handleConfirm,
    atRisk,
  };
};

export default useTrashCard;
