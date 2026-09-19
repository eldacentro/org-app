import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAtom } from 'jotai';
import { IconCheckCircle, IconError } from '@components/icons';
import { applicationsState } from '@states/persons';
import { apiCongregationDeleteApplication } from '@services/api/congregation';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';

/**
 * Borrar una solicitud de precursorado auxiliar.
 *
 * Hacía falta porque a veces un hermano envía la suya dos veces, y la única
 * forma de quitar la que sobra era que los tres del comité la rechazaran — que
 * además no es lo que ha pasado: nadie se la ha rechazado, simplemente está
 * repetida.
 *
 * El servidor ya sabía borrar (es lo que se usa por debajo cuando una solicitud
 * queda rechazada), y solo se lo admite a quien es del comité de servicio, que
 * es justo a quien se le enseña el botón.
 *
 * Borrar la SOLICITUD no toca la FICHA: si ya estaba aprobada, el hermano sigue
 * inscrito como precursor auxiliar, porque esa inscripción vive en su ficha. Es
 * lo que se quiere al limpiar una repetida, y el diálogo lo dice para que nadie
 * crea que borrando aquí retira un nombramiento.
 */
const useApplicationDelete = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [applications, setApplications] = useAtom(applicationsState);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const application = useMemo(
    () => applications.find((record) => record.request_id === id),
    [applications, id]
  );

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    if (busy) return;

    setOpen(false);
  };

  const handleConfirm = async () => {
    if (!application || busy) return;

    setBusy(true);

    try {
      await apiCongregationDeleteApplication(application.request_id);

      // Se quita de la lista de aquí, sin esperar a la próxima consulta. Lo que
      // devuelve el servidor viene cifrado y no hace falta para esto: la lista
      // que queda es la que había menos esta.
      setApplications((prev) =>
        prev.filter((record) => record.request_id !== application.request_id)
      );

      displaySnackNotification({
        header: 'Solicitud borrada',
        message: 'Ya no aparece en la lista, ni para el hermano que la envió.',
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });

      setOpen(false);
      navigate('/pioneer-applications');
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode((error as Error).message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setBusy(false);
    }
  };

  return {
    open,
    busy,
    approved: application?.status === 'approved',
    handleOpen,
    handleClose,
    handleConfirm,
  };
};

export default useApplicationDelete;
