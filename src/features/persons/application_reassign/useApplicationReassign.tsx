import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { IconCheckCircle, IconError } from '@components/icons';
import { applicationsState, personsState } from '@states/persons';
import { monthNamesState } from '@states/app';
import { congAccessCodeState, fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { encryptObject } from '@services/encryption';
import { apiCongregationSaveApplication } from '@services/api/congregation';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import {
  decryptApplications,
  refreshApplications,
} from '@services/app/ap_applications_sync';
import {
  mesesDeLaSolicitud,
  otraAprobadaCubre,
} from '@services/app/ap_applications';
import {
  addAPEnrollments,
  buildAPEnrollmentPeriods,
  removeAPEnrollments,
} from '@services/app/ap_enrollment';
import { dbPersonsSave } from '@services/dexie/persons';
import worker from '@services/worker/backupWorker';

/**
 * Mover una solicitud a la persona a la que de verdad corresponde.
 *
 * El caso real: antes de que se pudiera enviar por una persona delegada, un
 * padre mandaba la de su hija desde su propia cuenta y quedaba a su nombre. En
 * la lista salían dos suyas —una marcada como repetida— y no había manera de
 * arreglarlo.
 *
 * Si la solicitud YA está aprobada, mover solo la solicitud no arregla nada de
 * lo que importa: la inscripción de precursor auxiliar que creó la aprobación
 * sigue en la ficha equivocada, y de esa ficha salen los informes y los
 * listados. Así que se mueve también, y el diálogo lo dice antes de confirmar.
 */
const useApplicationReassign = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [applications, setApplications] = useAtom(applicationsState);

  const persons = useAtomValue(personsState);
  const monthNames = useAtomValue(monthNamesState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const congAccessCode = useAtomValue(congAccessCodeState);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const application = useMemo(
    () => applications.find((record) => record.request_id === id),
    [applications, id]
  );

  const nombreDe = (person_uid: string) => {
    const record = persons.find((item) => item.person_uid === person_uid);

    if (!record) return '';

    return buildPersonFullname(
      record.person_data.person_lastname.value,
      record.person_data.person_firstname.value,
      fullnameOption
    );
  };

  /** Qué va a pasar. Lo enseña el diálogo y lo ejecuta `handleConfirm`. */
  const plan = (person_uid: string) => {
    const anterior = application?.person_uid ?? '';
    const aprobada = application?.status === 'approved';

    // A quien la tenía solo se le retira la inscripción si no le queda otra
    // solicitud aprobada de esos meses que la justifique — si no, se le estaría
    // borrando un nombramiento de verdad.
    const conserva = otraAprobadaCubre(
      applications,
      anterior,
      application?.request_id ?? '',
      application?.months ?? []
    );

    return {
      aprobada,
      anterior,
      nombreAnterior: nombreDe(anterior),
      nombreNuevo: nombreDe(person_uid),
      meses: mesesDeLaSolicitud(
        {
          months: application?.months ?? [],
          continuous: !!application?.continuous,
        },
        monthNames
      ),
      quitaDelAnterior: aprobada && !conserva,
      conservaElAnterior: aprobada && conserva,
    };
  };

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    if (saving) return;

    setOpen(false);
  };

  const handleConfirm = async (person_uid: string) => {
    if (!application || saving) return;
    if (!person_uid || person_uid === application.person_uid) return;

    setSaving(true);

    try {
      const detalle = plan(person_uid);

      // Lo último del servidor antes de guardar: si no, esto pisaría una
      // aprobación que otro acabe de dar desde su móvil.
      const latest = await refreshApplications({ queryClient, congAccessCode });

      const remote = latest.applications.find(
        (record) => record.request_id === application.request_id
      );

      if (!remote) {
        setOpen(false);
        navigate('/pioneer-applications');
        return;
      }

      const local = structuredClone(application);
      local.coordinator = remote.coordinator || 'waiting';
      local.secretary = remote.secretary || 'waiting';
      local.service_overseer = remote.service_overseer || 'waiting';
      local.status = remote.status;
      local.person_uid = person_uid;

      // Quién la envió. Si no constaba, la envió quien la tenía a su nombre —
      // que es justo lo que se está corrigiendo, y conviene que quede escrito.
      if (!local.submitted_by && detalle.anterior) {
        local.submitted_by = detalle.anterior;
      }

      local.updatedAt = new Date().toISOString();

      encryptObject({
        data: local,
        table: 'applications',
        accessCode: latest.code,
      });

      const updates = await apiCongregationSaveApplication(local);

      setApplications(decryptApplications(updates, latest.code));

      // La inscripción, solo si estaba aprobada: si no, no hay ninguna.
      if (detalle.aprobada) {
        const periods = buildAPEnrollmentPeriods(application.months);

        const nueva = persons.find(
          (record) => record.person_uid === person_uid
        );

        if (nueva) {
          const conInscripcion = addAPEnrollments(nueva, periods);

          if (conInscripcion !== nueva) await dbPersonsSave(conInscripcion);
        }

        if (detalle.quitaDelAnterior) {
          const antigua = persons.find(
            (record) => record.person_uid === detalle.anterior
          );

          if (antigua) {
            const sinInscripcion = removeAPEnrollments(antigua, periods);

            if (sinInscripcion !== antigua) await dbPersonsSave(sinInscripcion);
          }
        }

        worker.postMessage('startWorker');
      }

      displaySnackNotification({
        header: 'Hecho',
        message: `La solicitud queda a nombre de ${detalle.nombreNuevo}.`,
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });

      setOpen(false);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode((error as Error).message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    open,
    saving,
    currentUid: application?.person_uid ?? '',
    plan,
    handleOpen,
    handleClose,
    handleConfirm,
  };
};

export default useApplicationReassign;
