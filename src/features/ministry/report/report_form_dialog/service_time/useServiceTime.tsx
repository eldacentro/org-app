import { useMemo, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  reportUserDraftState,
  userFieldServiceDailyReportsState,
} from '@states/user_field_service_reports';
import { displaySnackNotification } from '@services/states/app';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { getMessageByCode } from '@services/i18n/translation';
import { ServiceTimeProps } from './index.types';
import { personIsEnrollmentActive } from '@services/app/persons';
import { handleSaveDailyFieldServiceReport } from '@services/app/user_field_service_reports';
import { hoursCreditsEnabledState, userDataViewState } from '@states/settings';
import { UserBibleStudyType } from '@definition/user_bible_studies';
import { AssignmentCode } from '@definition/assignment';
import useMinistryDailyRecord from '@features/ministry/hooks/useMinistryDailyRecord';

const useServiceTime = ({ onClose }: ServiceTimeProps) => {
  const { t } = useAppTranslation();

  const { person } = useCurrentUser();

  const bibleStudyRef = useRef<Element>(null);

  const hoursRef = useRef<Element>(null);

  const [currentReport, setCurrentReport] = useAtom(reportUserDraftState);

  const dailyReports = useAtomValue(userFieldServiceDailyReportsState);

  const hoursCreditEnabled = useAtomValue(hoursCreditsEnabledState);
  const dataView = useAtomValue(userDataViewState);

  const { bibleStudies, hours_credit, hours_field } =
    useMinistryDailyRecord(currentReport);

  const monthReport = useMemo(() => {
    if (!currentReport) return;

    const date = currentReport.report_date;
    return date.substring(0, date.length - 3);
  }, [currentReport]);

  const hoursEnabled = useMemo(() => {
    if (!monthReport) return false;

    const isAP = personIsEnrollmentActive(person, 'AP', monthReport);
    const isFR = personIsEnrollmentActive(person, 'FR', monthReport);
    const isFMF = personIsEnrollmentActive(person, 'FMF', monthReport);
    const isFS = personIsEnrollmentActive(person, 'FS', monthReport);

    return isAP || isFR || isFMF || isFS;
  }, [person, monthReport]);

  const hours_credit_enabled = useMemo(() => {
    if (!person) return false;

    const hasAssignment =
      person.person_data.assignments
        .find((a) => a.type === dataView)
        ?.values.includes(AssignmentCode.MINISTRY_HOURS_CREDIT) ?? false;

    return hoursCreditEnabled ? hasAssignment : false;
  }, [person, hoursCreditEnabled, dataView]);

  // El borrador siempre está "listo" para guardar visualmente, pero no hay
  // nada nuevo que guardar si coincide con lo que ya está persistido (o si
  // está vacío y nunca se guardó nada) — deshabilita el botón en esos casos
  // para que "Guardar" deje de verse igual antes y después de guardar.
  const isDirty = useMemo(() => {
    if (!currentReport) return false;

    const draftData = currentReport.report_data;

    const draftHasContent =
      draftData.bible_studies.value > 0 ||
      draftData.hours.field_service.length > 0 ||
      draftData.hours.credit.length > 0;

    const persisted = dailyReports.find(
      (r) => r.report_date === currentReport.report_date
    );

    if (!persisted) return draftHasContent;

    const persistedData = persisted.report_data;

    return (
      draftData.hours.field_service !== persistedData.hours.field_service ||
      draftData.hours.credit !== persistedData.hours.credit ||
      draftData.bible_studies.value !== persistedData.bible_studies.value ||
      draftData.bible_studies.records.length !==
        persistedData.bible_studies.records.length ||
      draftData.bible_studies.records.some(
        (id, idx) => id !== persistedData.bible_studies.records[idx]
      )
    );
  }, [currentReport, dailyReports]);

  const handleHoursChange = (value: string) => {
    const newReport = structuredClone(currentReport);

    newReport.report_data.hours.field_service = value;
    newReport.report_data.updatedAt = new Date().toISOString();
    setCurrentReport(newReport);
  };

  const handleHoursCreditChange = (value: string) => {
    const newReport = structuredClone(currentReport);

    newReport.report_data.hours.credit = value;
    newReport.report_data.updatedAt = new Date().toISOString();
    setCurrentReport(newReport);
  };

  const bibleStudiesValidator = async (value: number) => {
    if (!currentReport) return true;

    const result = currentReport.report_data.bible_studies.records.length;

    if (value < result) {
      displaySnackNotification({
        header: t('tr_cantDeductStudiesTitle'),
        message: t('tr_cantDeductStudiesDesc'),
        severity: 'error',
      });

      return false;
    }

    return true;
  };

  const handleBibleStudiesChange = async (value: number) => {
    const newReport = structuredClone(currentReport);

    newReport.report_data.bible_studies.value = value;
    newReport.report_data.updatedAt = new Date().toISOString();
    setCurrentReport(newReport);
  };

  const handleSelectPreset = (value: number, name: string) => {
    const newReport = structuredClone(currentReport);

    newReport.report_data.hours.credit = `${value}:00`;
    newReport.report_data.comments = `${name}: {{ hours }}`;
    newReport.report_data.updatedAt = new Date().toISOString();
    setCurrentReport(newReport);

    displaySnackNotification({
      header: t('tr_ministry'),
      message: t('tr_hoursCreditPresetAddedInfo'),
      severity: 'success',
    });
  };

  const handleSaveReport = async () => {
    if (currentReport.report_date.length === 0) return;

    if (
      !currentReport.report_data.bible_studies.value &&
      currentReport.report_data.hours.field_service.length === 0 &&
      currentReport.report_data.hours.credit.length === 0
    ) {
      return;
    }

    try {
      const report = structuredClone(currentReport);
      report.report_data._deleted = false;
      await handleSaveDailyFieldServiceReport(report);

      displaySnackNotification({
        header: t('tr_ministry'),
        message: t('tr_dailyReportSaved', 'Informe guardado'),
        severity: 'success',
      });

      onClose();
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
    const newReport = structuredClone(currentReport);

    newReport.report_data._deleted = true;
    newReport.report_data.updatedAt = new Date().toISOString();

    await handleSaveDailyFieldServiceReport(newReport);

    displaySnackNotification({
      header: t('tr_ministry'),
      message: t('tr_dailyReportDeleted', 'Informe eliminado'),
      severity: 'success',
    });

    onClose();
  };

  const handleCheckSelected = (study: UserBibleStudyType) => {
    return bibleStudies.records.some(
      (record) => record.person_uid === study.person_uid
    );
  };

  const handleSelectStudy = (study: UserBibleStudyType) => {
    const findStudy = currentReport.report_data.bible_studies.records.some(
      (record) => record === study.person_uid
    );

    if (findStudy) return;

    const report = structuredClone(currentReport);

    report.report_data.bible_studies.records.push(study.person_uid);

    const cnCount = report.report_data.bible_studies.value;
    report.report_data.bible_studies.value = cnCount ? cnCount + 1 : 1;

    report.report_data.updatedAt = new Date().toISOString();

    setCurrentReport(report);
  };

  return {
    bibleStudyRef,
    hours_field,
    handleHoursChange,
    bibleStudies,
    handleBibleStudiesChange,
    bibleStudiesValidator,
    handleSaveReport,
    isDirty,
    handleHoursCreditChange,
    hours_credit,
    hours_credit_enabled,
    hoursEnabled,
    hoursRef,
    handleSelectPreset,
    handleDeleteReport,
    handleCheckSelected,
    handleSelectStudy,
  };
};

export default useServiceTime;
