import {
  effectiveCreditHours,
  rawCreditHours,
} from '@services/app/credit_hours';
import { useMemo, useState } from 'react';
import { capitalizarPrimera } from '@utils/common';
import { useAtomValue } from 'jotai';
import { useBreakpoints } from '@hooks/index';
import { MonthItemProps, MonthStatusType } from './index.types';
import { monthNamesState } from '@states/app';
import { currentMonthServiceYear, formatDate } from '@utils/date';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { branchFieldReportsState } from '@states/branch_field_service_reports';
import useReportEditScope from '@hooks/useReportEditScope';
import usePerson from '@features/persons/hooks/usePerson';

const useMonthItem = ({ month, person }: MonthItemProps) => {
  const { laptopDown } = useBreakpoints();

  const { canEditReportOf } = useReportEditScope();

  const {
    personIsEnrollmentActive,
    personIsBaptizedPublisher,
    personIsUnbaptizedPublisher,
  } = usePerson();

  const monthNames = useAtomValue(monthNamesState);

  const reports = useAtomValue(congFieldServiceReportsState);
  const branchReports = useAtomValue(branchFieldReportsState);

  const [showEdit, setShowEdit] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const first_report = useMemo(() => {
    if (!person) return;

    if (person.person_data.first_report?.value) {
      return formatDate(
        new Date(person.person_data.first_report.value),
        'yyyy/MM'
      );
    }

    // get all status history
    let history = [
      ...person.person_data.publisher_unbaptized.history,
      ...person.person_data.publisher_baptized.history,
    ];

    history = history.filter(
      (record) => !record._deleted && record.start_date?.length > 0
    );

    history.sort((a, b) => a.start_date.localeCompare(b.start_date));

    if (history.length === 0) return;

    const firstDate = new Date(history.at(0).start_date);

    return formatDate(firstDate, 'yyyy/MM');
  }, [person]);

  const branchReport = useMemo(() => {
    return branchReports.find((record) => record.report_date === month);
  }, [branchReports, month]);

  const branch_report_submitted = useMemo(() => {
    if (!branchReport) return;

    return branchReport.report_data.submitted;
  }, [branchReport]);

  const report = useMemo(() => {
    if (!person) return;

    return reports.find(
      (record) =>
        record.report_data.report_date === month &&
        record.report_data.person_uid === person.person_uid
    );
  }, [reports, month, person]);

  const monthname = useMemo(() => {
    const monthIndex = +month.split('/')[1] - 1;
    return capitalizarPrimera(monthNames[monthIndex]);
  }, [month, monthNames]);

  const isCurrent = useMemo(() => {
    const current = currentMonthServiceYear();

    return month === current;
  }, [month]);

  const isAhead = useMemo(() => {
    const current = currentMonthServiceYear();

    return month > current;
  }, [month]);

  const not_publisher = useMemo(() => {
    if (!first_report || first_report?.length === 0) return true;

    if (month < first_report) return true;

    return false;
  }, [first_report, month]);

  const monthStatus: MonthStatusType = useMemo(() => {
    if (not_publisher) return;

    if (!report) return 'not_shared';

    const status = report.report_data.shared_ministry ? 'shared' : 'not_shared';
    return status;
  }, [report, not_publisher]);

  // Ver y editar no son lo mismo. Un anciano que no sea secretario ve los
  // informes de toda la congregación pero solo edita los de SU grupo; el
  // auxiliar de grupo, igual. El secretario los edita todos.
  //
  // Antes aquí había un `if (isElder) return true` —cualquier anciano editaba
  // el de cualquiera— y una comprobación de grupo aparte que miraba a qué grupo
  // PERTENECE uno, no cuál lleva. Ahora sale del mismo criterio que usa el
  // servidor para decidir qué acepta (`useReportEditScope`); si fueran dos
  // criterios distintos, uno de los dos mentiría.
  const isRoleEditor = useMemo(() => {
    if (!person) return false;

    return canEditReportOf(person.person_uid);
  }, [person, canEditReportOf]);

  const isAP = useMemo(() => {
    return personIsEnrollmentActive(person, 'AP', month);
  }, [person, month, personIsEnrollmentActive]);

  const field_hours = useMemo(() => {
    if (!report) return 0;

    return report.report_data.hours.field_service;
  }, [report]);

  const credit_hours = useMemo(() => {
    if (!report) return 0;

    // El que CUENTA ese mes, no el apuntado: si la predicación ya llega a 55,
    // el crédito no suma nada y enseñarlo daría a entender lo contrario. Lo
    // apuntado sigue estando en el detalle del informe. Ver `credit_hours.ts`.
    return effectiveCreditHours(
      report.report_data.hours.field_service,
      rawCreditHours(report.report_data.hours.credit)
    );
  }, [report]);

  const bible_studies = useMemo(() => {
    if (!report) return 0;

    return report.report_data.bible_studies;
  }, [report]);

  const comments = useMemo(() => {
    if (!report) return '';

    return report.report_data?.comments || '';
  }, [report]);

  const isInactive = useMemo(() => {
    if (!person) return true;

    const isBaptized = personIsBaptizedPublisher(person, month);
    const isUnbaptized = personIsUnbaptizedPublisher(person, month);

    const active = isBaptized || isUnbaptized;

    return !active;
  }, [person, month, personIsBaptizedPublisher, personIsUnbaptizedPublisher]);

  const allowEdit = useMemo(() => {
    if (isInactive) return false;

    if (!first_report || first_report?.length === 0) return false;

    if (month < first_report) return false;

    if (!branchReport) return true;

    return true;
  }, [isInactive, month, first_report, branchReport]);

  const report_locked = useMemo(() => {
    return branch_report_submitted && monthStatus === 'shared';
  }, [branch_report_submitted, monthStatus]);

  const mobileShowEdit = useMemo(() => {
    if (!allowEdit) return false;

    if (isCurrent || isAhead) return false;

    return true;
  }, [allowEdit, isCurrent, isAhead]);

  const showEditIcon = useMemo(() => {
    if (!isRoleEditor) return false;

    if (report_locked) return false;

    return showEdit || (laptopDown && mobileShowEdit);
  }, [isRoleEditor, report_locked, laptopDown, mobileShowEdit, showEdit]);

  const showReadOnlyIcon = useMemo(() => {
    if (!isRoleEditor) return false;

    if (!report_locked) return false;

    return showEdit || (laptopDown && mobileShowEdit);
  }, [isRoleEditor, report_locked, laptopDown, mobileShowEdit, showEdit]);

  const handleHover = () => {
    if (!mobileShowEdit || !isRoleEditor) return;

    setShowEdit(true);
  };

  const handleUnhover = () => {
    if (!mobileShowEdit || !isRoleEditor) return;

    setShowEdit(false);
  };

  const handleOpenEditor = () => {
    setShowEdit(false);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setShowEdit(false);
    setEditorOpen(false);
  };

  return {
    monthname,
    monthStatus,
    bible_studies,
    field_hours,
    credit_hours,
    isAP,
    comments,
    isCurrent,
    isAhead,
    handleHover,
    handleUnhover,
    editorOpen,
    handleOpenEditor,
    handleCloseEditor,
    not_publisher,
    branch_report_submitted,
    showEditIcon,
    showReadOnlyIcon,
  };
};

export default useMonthItem;
