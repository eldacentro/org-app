import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { IconCheckCircle, IconError } from '@components/icons';
import { APFormType, APHours, APRecordType } from '@definition/ministry';
import { applicationsState, personsState } from '@states/persons';
import { congAccessCodeState, fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { useAppTranslation } from '@hooks/index';
import { displaySnackNotification } from '@services/states/app';
import { encryptObject } from '@services/encryption';
import {
  apiCongregationDeleteApplication,
  apiCongregationSaveApplication,
} from '@services/api/congregation';
import { getMessageByCode } from '@services/i18n/translation';
import {
  addAPEnrollments,
  buildAPEnrollmentPeriods,
} from '@services/app/ap_enrollment';
import { horasDeLaSolicitud } from '@services/app/ap_applications';
import {
  decryptApplications,
  refreshApplications,
} from '@services/app/ap_applications_sync';
import { dbPersonsSave } from '@services/dexie/persons';

const useApplicationPerson = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { t } = useAppTranslation();

  const [applications, setApplications] = useAtom(applicationsState);

  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const congAccessCode = useAtomValue(congAccessCodeState);

  const application = useMemo(() => {
    return applications.find((record) => record.request_id === id);
  }, [id, applications]);

  const name = useMemo(() => {
    if (!application) return '';

    const person = persons.find(
      (record) => record.person_uid === application.person_uid
    );

    if (!person) return '';

    return buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );
  }, [application, persons, fullnameOption]);

  const [formData, setFormData] = useState<APFormType>({
    continuous: application?.continuous,
    date: application && new Date(application.submitted),
    months: application?.months,
    name: name,
    hours: horasDeLaSolicitud(application),
    coordinator: application?.coordinator,
    secretary: application?.secretary,
    service_overseer: application?.service_overseer ?? application?.['service'],
  });

  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    setFormData({
      continuous: application?.continuous,
      date: application && new Date(application.submitted),
      months: application?.months,
      name: name,
      hours: horasDeLaSolicitud(application),
      coordinator: application?.coordinator,
      secretary: application?.secretary,
      service_overseer:
        application?.service_overseer ?? application?.['service'],
    });
  }, [application, name]);

  const handleFormChange = (value: APFormType) => setFormData(value);

  const handleDecryptApplications = (
    applications: APRecordType[],
    code: string
  ) => decryptApplications(applications, code);

  const handleRefreshApplications = () =>
    refreshApplications({ queryClient, congAccessCode });

  /**
   * Aprobar no es solo cambiar el estado de la solicitud: la persona tiene que
   * quedar de verdad inscrita como precursora auxiliar de los meses que pide,
   * porque de esa inscripción (`enrollments`, tipo 'AP') salen los informes,
   * la pestaña "Este mes" y todo lo demás. Si esto no se guarda, la solicitud
   * aparece aprobada y el hermano no consta en ningún sitio.
   */
  const handlePersonUpdate = async (application: APRecordType) => {
    const findPerson = persons.find(
      (record) => record.person_uid === application.person_uid
    );

    // La solicitud ya se guardó como aprobada en el servidor antes de llegar
    // aquí; si el solicitante ya no está (borrado o archivado), callar dejaría
    // la solicitud aprobada y a nadie inscrito. Se avisa en vez de reventar.
    if (!findPerson) {
      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: t('tr_applicantNotFound'),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });

      return;
    }

    const periods = buildAPEnrollmentPeriods(application.months);

    if (periods.length === 0) return;

    // Idempotente: volver a pulsar "aprobar" sobre una solicitud ya aprobada
    // llegaba a apilar una inscripción 'AP' repetida por cada pulsación.
    // `addAPEnrollments` devuelve la MISMA ficha si no hay nada que añadir, y
    // es la misma cuenta que usa el cambio de persona (`handleReassign`).
    const person = addAPEnrollments(findPerson, periods);

    if (person === findPerson) return;

    await dbPersonsSave(person);

    displaySnackNotification({
      header: t('tr_newAPAdded'),
      message: t('tr_pubApprovedAsAP'),
      severity: 'success',
      icon: <IconCheckCircle color="var(--card)" />,
    });
  };

  const handleApprovalChange = async (role: string, approval: string) => {
    try {
      const latestData = await handleRefreshApplications();

      const remote = latestData.applications.find(
        (record) => record.request_id === application.request_id
      );

      if (!remote) {
        return navigate('/pioneer-applications');
      }

      const local = structuredClone(application);
      local.coordinator = remote.coordinator || 'waiting';
      local.secretary = remote.secretary || 'waiting';
      local.service_overseer = remote.service_overseer || 'waiting';
      local.updatedAt = remote.updatedAt;

      local[role] = approval;

      let updates: APRecordType[];

      const waiting =
        local.coordinator === 'waiting' ||
        local.secretary === 'waiting' ||
        local.service_overseer === 'waiting';

      const rejected =
        !waiting &&
        (local.coordinator === 'rejected' ||
          local.secretary === 'rejected' ||
          local.service_overseer === 'rejected');

      // delete application
      if (rejected) {
        updates = await apiCongregationDeleteApplication(local.request_id);
      }

      if (!rejected) {
        if (
          local.coordinator === 'approved' &&
          local.secretary === 'approved' &&
          local.service_overseer === 'approved'
        ) {
          local.status = 'approved';
          local.notified = true;
        }

        local.updatedAt = new Date().toISOString();

        encryptObject({
          data: local,
          table: 'applications',
          accessCode: latestData.code,
        });

        updates = await apiCongregationSaveApplication(local);
      }

      const newApplications = handleDecryptApplications(
        updates,
        latestData.code
      );

      setApplications(newApplications);

      if (rejected) {
        displaySnackNotification({
          header: t('tr_applicationRejected'),
          message: t('tr_applicationRejectedDesc'),
          severity: 'success',
          icon: <IconCheckCircle color="var(--card)" />,
        });

        navigate('/pioneer-applications');
      }

      const newApplication = newApplications.find(
        (record) => record.request_id === application.request_id
      );

      if (newApplication?.status === 'approved') {
        await handlePersonUpdate(newApplication);
      }
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    }
  };

  /**
   * Las horas (30 o 15) de una solicitud YA ENVIADA.
   *
   * Aquí no hay botón de guardar —la pantalla es el formulario aprobándose—, así
   * que se guarda al elegir. Es lo único del formulario que el comité puede
   * cambiar: los meses, la fecha y el nombre son lo que el hermano escribió.
   *
   * Se hace con el mismo cuidado que una aprobación: primero se trae lo último
   * del servidor, para no pisar con una copia vieja la aprobación que otro
   * acabe de dar desde su móvil.
   */
  const handleHoursChange = async (hours: APHours) => {
    if (savingHours || !application) return;

    setSavingHours(true);

    try {
      const latestData = await handleRefreshApplications();

      const remote = latestData.applications.find(
        (record) => record.request_id === application.request_id
      );

      if (!remote) {
        return navigate('/pioneer-applications');
      }

      const local = structuredClone(application);
      local.coordinator = remote.coordinator || 'waiting';
      local.secretary = remote.secretary || 'waiting';
      local.service_overseer = remote.service_overseer || 'waiting';
      local.status = remote.status;
      local.hours = hours;
      local.updatedAt = new Date().toISOString();

      encryptObject({
        data: local,
        table: 'applications',
        accessCode: latestData.code,
      });

      const updates = await apiCongregationSaveApplication(local);

      setApplications(handleDecryptApplications(updates, latestData.code));

      displaySnackNotification({
        header: t('tr_done', 'Hecho'),
        message: `La solicitud queda de ${hours} horas.`,
        severity: 'success',
        icon: <IconCheckCircle color="var(--card)" />,
      });
    } catch (error) {
      console.error(error);

      // No se ha guardado: el desplegable vuelve a lo que hay guardado.
      setFormData((prev) => ({
        ...prev,
        hours: horasDeLaSolicitud(application),
      }));

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode((error as Error).message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    } finally {
      setSavingHours(false);
    }
  };

  const handleCoordinatorApproved = async () => {
    await handleApprovalChange('coordinator', 'approved');
  };

  const handleCoordinatorRejected = async () => {
    await handleApprovalChange('coordinator', 'rejected');
  };

  const handleSecretaryApproved = async () => {
    await handleApprovalChange('secretary', 'approved');
  };

  const handleSecretaryRejected = async () => {
    await handleApprovalChange('secretary', 'rejected');
  };

  const handleServiceApproved = async () => {
    await handleApprovalChange('service_overseer', 'approved');
  };

  const handleServiceRejected = async () => {
    await handleApprovalChange('service_overseer', 'rejected');
  };

  return {
    formData,
    handleFormChange,
    handleHoursChange,
    handleCoordinatorApproved,
    handleCoordinatorRejected,
    handleSecretaryApproved,
    handleSecretaryRejected,
    handleServiceApproved,
    handleServiceRejected,
  };
};

export default useApplicationPerson;
