import { useAtomValue } from 'jotai';
import { PersonType } from '@definition/person';
import { congFieldServiceReportsState } from '@states/field_service_reports';
import { CongFieldServiceReportType } from '@definition/cong_field_service_reports';
import { personsState } from '@states/persons';
import usePerson from '@features/persons/hooks/usePerson';
import { fieldWithLanguageGroupsState } from '@states/field_service_groups';
import { useMemo } from 'react';

const useReportMonthly = (group?: string) => {
  const { personIsEnrollmentActive } = usePerson();

  const fieldGroups = useAtomValue(fieldWithLanguageGroupsState);
  const reports = useAtomValue(congFieldServiceReportsState);
  const allPersons = useAtomValue(personsState);

  const persons = useMemo(() => {
    if (!group || group === 'all') {
      return allPersons;
    }

    const foundGroup = fieldGroups.find((g) => g.group_id === group);

    if (!foundGroup) {
      console.warn(`Group with id "${group}" not found`);
      return [];
    }

    return allPersons.filter((person) =>
      foundGroup.group_data.members.some(
        (personInGroup) => personInGroup.person_uid === person.person_uid
      )
    );
  }, [allPersons, fieldGroups, group]);

  // La regla de los 6 meses vivía duplicada aquí (solo para el S-1) y en los
  // filtros de informes. Ahora `getPublishersActive` ya la aplica, así que el
  // recuento de la sucursal y lo que se ve en pantalla no pueden discrepar:
  // ver services/app/publisher_status.ts.

  const personHasReport = (person: PersonType, month: string) => {
    const hasReport = reports.some((report) => {
      if (report.report_data.person_uid !== person.person_uid) return false;
      if (!report.report_data.shared_ministry) return false;

      return report.report_data.report_date === month;
    });

    return hasReport;
  };

  const getFTSReportsMonth = (month: string) => {
    const data = reports.filter(
      (record) => record.report_data.report_date === month
    );

    const result: CongFieldServiceReportType[] = [];

    for (const report of data) {
      const person = persons.find(
        (record) => record.person_uid === report.report_data.person_uid
      );
      if (!person) continue;

      const isFMF = personIsEnrollmentActive(
        person,
        'FMF',
        report.report_data.report_date
      );

      const isFR = personIsEnrollmentActive(
        person,
        'FR',
        report.report_data.report_date
      );

      const isFS = personIsEnrollmentActive(
        person,
        'FS',
        report.report_data.report_date
      );

      if (isFMF || isFR || isFS) {
        result.push(report);
      }
    }

    return result;
  };

  const getAPReportsMonth = (month: string) => {
    const data = reports.filter(
      (record) => record.report_data.report_date === month
    );

    const result: CongFieldServiceReportType[] = [];

    for (const report of data) {
      const person = persons.find(
        (record) => record.person_uid === report.report_data.person_uid
      );
      if (!person) continue;

      const isAP = personIsEnrollmentActive(
        person,
        'AP',
        report.report_data.report_date
      );

      if (isAP) {
        result.push(report);
      }
    }

    return result;
  };

  const getPublisherReportsMonth = (month: string) => {
    const data = reports.filter(
      (record) => record.report_data.report_date === month
    );

    const result: CongFieldServiceReportType[] = [];

    for (const report of data) {
      const person = persons.find(
        (record) => record.person_uid === report.report_data.person_uid
      );
      if (!person) continue;

      const isFMF = personIsEnrollmentActive(
        person,
        'FMF',
        report.report_data.report_date
      );

      const isFR = personIsEnrollmentActive(
        person,
        'FR',
        report.report_data.report_date
      );

      const isFS = personIsEnrollmentActive(
        person,
        'FS',
        report.report_data.report_date
      );

      const isAP = personIsEnrollmentActive(
        person,
        'AP',
        report.report_data.report_date
      );

      if (isFMF || isFR || isFS || isAP) continue;

      result.push(report);
    }

    return result;
  };

  return {
    personHasReport,
    getFTSReportsMonth,
    getAPReportsMonth,
    getPublisherReportsMonth,
  };
};

export default useReportMonthly;
