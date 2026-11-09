import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  congFieldServiceReportsState,
  selectedMonthFieldServiceReportState,
  selectedPublisherReportState,
} from '@states/field_service_reports';
import { personsState } from '@states/persons';
import { displaySnackNotification } from '@services/states/app';
import { useAppTranslation } from '@hooks/index';
import { getMessageByCode } from '@services/i18n/translation';
import { dbPersonsSave } from '@services/dexie/persons';
import { dbFieldServiceReportsSave } from '@services/dexie/cong_field_service_reports';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import { formatDate } from '@utils/date';
import usePerson from '@features/persons/hooks/usePerson';
import { openPeriod } from '@utils/spiritual_status';
import { reportAuthorRole } from '@services/app/report_author';
import {
  editableAfterMonthSent,
  normalizeLegacyLate,
} from '@services/app/late_reports';
import { personGetDisplayName } from '@utils/common';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';

const useReportDetails = () => {
  const { t } = useAppTranslation();

  const {
    personIsEnrollmentActive,
    personIsBaptizedPublisher,
    personIsUnbaptizedPublisher,
  } = usePerson();

  const [publisher, setPublisher] = useAtom(selectedPublisherReportState);

  const persons = useAtomValue(personsState);
  const currentMonth = useAtomValue(selectedMonthFieldServiceReportState);
  const reports = useAtomValue(congFieldServiceReportsState);
  const branchReports = useAtomValue(branchFieldReportsState);
  // Cruda, por lo mismo que en `useReportEditScope`: la lista de pantalla
  // esconde a los inactivos, y entonces al autor de su informe se le
  // etiquetaría como secretaría en vez de como su responsable de grupo.
  const groups = useAtomValue(fieldServiceGroupsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const person = useMemo(() => {
    return persons.find((record) => record.person_uid === publisher);
  }, [persons, publisher]);

  const report = useMemo(() => {
    if (!person) return;

    return reports.find(
      (record) =>
        record.report_data.person_uid === person.person_uid &&
        record.report_data.report_date === currentMonth
    );
  }, [reports, currentMonth, person]);

  /**
   * Quién metió este informe, con su cargo. `null` si no consta — los informes
   * anteriores a que esto existiera no lo llevan, y ahí no se inventa un autor.
   */
  const addedBy = useMemo(() => {
    const authorUid = report?.report_data.by;

    if (!authorUid || !person) return null;

    const role = reportAuthorRole({
      authorUid,
      publisherUid: person.person_uid,
      groups,
    });

    const author = persons.find((record) => record.person_uid === authorUid);

    const name = author
      ? personGetDisplayName(author, displayNameEnabled, fullnameOption)
      : '';

    return { name, role };
  }, [report, person, persons, groups, displayNameEnabled, fullnameOption]);

  const isAP = useMemo(() => {
    if (!person) return false;

    return personIsEnrollmentActive(person, 'AP', currentMonth);
  }, [person, currentMonth, personIsEnrollmentActive]);

  const isFMF = useMemo(() => {
    if (!person) return false;

    return personIsEnrollmentActive(person, 'FMF', currentMonth);
  }, [person, currentMonth, personIsEnrollmentActive]);

  const isFR = useMemo(() => {
    if (!person) return false;

    return personIsEnrollmentActive(person, 'FR', currentMonth);
  }, [person, currentMonth, personIsEnrollmentActive]);

  const isFS = useMemo(() => {
    if (!person) return false;

    return personIsEnrollmentActive(person, 'FS', currentMonth);
  }, [person, currentMonth, personIsEnrollmentActive]);

  const isInactive = useMemo(() => {
    if (!person) return true;

    const isBaptized = personIsBaptizedPublisher(person, currentMonth);
    const isUnbaptized = personIsUnbaptizedPublisher(person, currentMonth);

    const active = isBaptized || isUnbaptized;

    return !active;
  }, [
    person,
    currentMonth,
    personIsBaptizedPublisher,
    personIsUnbaptizedPublisher,
  ]);

  const report_editable = useMemo(() => {
    const report = branchReports.find(
      (record) => record.report_date === currentMonth
    );

    if (!report) return true;

    return !report.report_data.submitted;
  }, [branchReports, currentMonth]);

  const enable_quick_AP = useMemo(() => {
    if (!report_editable) return false;

    if (isFMF || isFR || isFS || isAP) {
      return false;
    }

    if (!person) return false;

    const isBaptized = personIsBaptizedPublisher(person);
    return isBaptized;
  }, [
    isAP,
    isFMF,
    isFR,
    isFS,
    personIsBaptizedPublisher,
    person,
    report_editable,
  ]);

  // Con el mes ya enviado, el atrasado que todavía no ha salido y el que es
  // solo para la tarjeta siguen siendo cosa del secretario: se pueden
  // verificar y borrar. Antes el botón de verificar desaparecía, y el
  // atrasado que manda el propio publicador desde su móvil —que llega sin
  // verificar— no se podía verificar nunca y no se sumaba a ningún S-1.
  const report_open = report_editable || editableAfterMonthSent(report);

  const unverified = useMemo(() => {
    if (!person) return false;

    if (!report_open) return false;

    if (!report) return false;

    const status = report.report_data.status;

    return status === 'received';
  }, [person, report_open, report]);

  const deletable = useMemo(() => {
    if (!person) return false;

    if (!report_open) return false;

    return report ? true : false;
  }, [report, report_open, person]);

  const handleBack = () => setPublisher(undefined);

  const handleAssignAP = async () => {
    try {
      const newPerson = structuredClone(person);

      const [year, month] = currentMonth.split('/');

      const startDate = `${currentMonth}/01`;
      const endDate = formatDate(new Date(+year, +month, 0), 'yyyy/MM/dd');

      newPerson.person_data.enrollments.push({
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        _deleted: false,
        enrollment: 'AP',
        start_date: startDate,
        end_date: endDate,
      });

      await dbPersonsSave(newPerson);

      displaySnackNotification({
        header: t('tr_quickAssignAP'),
        message: t('tr_quickAssignAPDesc'),
        severity: 'success',
      });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleVerifyReport = async () => {
    try {
      const foundReport = structuredClone(report);
      foundReport.report_data.status = 'confirmed';
      foundReport.report_data.late = normalizeLegacyLate(
        foundReport.report_data.late
      );
      foundReport.report_data.updatedAt = new Date().toISOString();

      await dbFieldServiceReportsSave(foundReport, { keepAuthor: true });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleMarkAsActive = async () => {
    try {
      const newPerson = structuredClone(person);

      const isBaptized = newPerson.person_data.publisher_baptized.active.value;
      const isUnbaptized =
        newPerson.person_data.publisher_unbaptized.active.value;

      const startDate = new Date(`${currentMonth}/01`).toISOString();

      // openPeriod no hace nada si ya hay un periodo abierto: sin eso, marcar
      // como activo a quien ya lo estaba dejaba dos periodos solapados.
      if (isBaptized) {
        openPeriod(newPerson.person_data.publisher_baptized.history, startDate);
      }

      if (isUnbaptized) {
        openPeriod(
          newPerson.person_data.publisher_unbaptized.history,
          startDate
        );
      }

      await dbPersonsSave(newPerson);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  const handleDeleteReport = async () => {
    try {
      const foundReport = structuredClone(report);
      foundReport.report_data._deleted = true;
      foundReport.report_data.updatedAt = new Date().toISOString();

      await dbFieldServiceReportsSave(foundReport, { keepAuthor: true });
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    addedBy,
    person,
    handleBack,
    enable_quick_AP,
    unverified,
    handleAssignAP,
    handleVerifyReport,
    isInactive,
    handleMarkAsActive,
    currentMonth,
    deletable,
    handleDeleteReport,
  };
};

export default useReportDetails;
