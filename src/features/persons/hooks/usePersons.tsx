import { useAtomValue } from 'jotai';
import { personsActiveState } from '@states/persons';
import { ministryMonthsState } from '@states/field_service_reports';
import usePerson from './usePerson';
import { fieldWithLanguageGroupsState } from '@states/field_service_groups';
import { useMemo } from 'react';
import {
  personBecameInactiveDuring,
  personIsActivePublisher,
  personIsInactivePublisher,
} from '@services/app/publisher_status';

const usePersons = (group?: string) => {
  const fieldGroups = useAtomValue(fieldWithLanguageGroupsState);

  const {
    personIsBaptizedPublisher,
    personIsUnbaptizedPublisher,
    personIsPrivilegeActive,
    personIsEnrollmentActive,
    personIsEnrollmentYearActive,
    personIsPublisherYear,
  } = usePerson();

  const allPersons = useAtomValue(personsActiveState);

  // Activo/inactivo se decide con los informes: ver publisher_status.ts.
  const ministryMonths = useAtomValue(ministryMonthsState);

  const persons = useMemo(() => {
    if (!group || group === 'all') {
      return allPersons;
    }

    const foundGroup = fieldGroups.find((g) => g.group_id === group);

    if (!foundGroup) {
      return [];
    }

    return allPersons.filter((person) =>
      foundGroup.group_data.members.some(
        (personInGroup) => personInGroup.person_uid === person.person_uid
      )
    );
  }, [allPersons, fieldGroups, group]);

  const getPublishersActive = (month: string) => {
    return persons.filter((record) =>
      personIsActivePublisher(record, ministryMonths, month)
    );
  };

  const getPublishersInactive = (month: string) => {
    return persons.filter((record) =>
      personIsInactivePublisher(record, ministryMonths, month)
    );
  };

  const getPublishersBaptized = (month: string) => {
    const result = persons.filter((record) => {
      const isBaptized = personIsBaptizedPublisher(record, month);
      return isBaptized;
    });

    return result;
  };

  const getPublishersUnbaptized = (month: string) => {
    const result = persons.filter((record) => {
      const isUnbaptized = personIsUnbaptizedPublisher(record, month);
      return isUnbaptized;
    });

    return result;
  };

  const getAppointedBrothers = (month: string) => {
    const result = persons.filter((record) => {
      const isElder = personIsPrivilegeActive(record, 'elder', month);
      if (isElder) return true;

      const isMS = personIsPrivilegeActive(record, 'ms', month);
      return isMS;
    });

    return result;
  };

  const getAuxiliaryPioneers = (month: string) => {
    const result = persons.filter((record) => {
      const isAP = personIsEnrollmentActive(record, 'AP', month);
      return isAP;
    });

    return result;
  };

  const getRegularPioneers = (month: string) => {
    const result = persons.filter((record) => {
      const isAP = personIsEnrollmentActive(record, 'FR', month);
      return isAP;
    });

    return result;
  };

  // Cuántos se quedaron inactivos DURANTE ese año de servicio (informe S-10).
  // Antes se deducía de las fechas de fin del historial, que es justo lo que
  // se contradecía con el resto: ahora se mira mes a mes con la misma regla
  // de los 6 meses sin informar.
  const getPublishersInactiveYears = (year: string) => {
    const startMonth = `${+year - 1}/09`;
    const endMonth = `${year}/08`;

    return persons.filter((person) =>
      personBecameInactiveDuring(person, ministryMonths, startMonth, endMonth)
    );
  };

  const getFTSYears = (year: string) => {
    const result = persons.filter((person) => {
      const isFMF = personIsEnrollmentYearActive(person, 'FMF', year);
      const isFR = personIsEnrollmentYearActive(person, 'FR', year);
      const isFS = personIsEnrollmentYearActive(person, 'FS', year);

      return isFMF || isFR || isFS;
    });

    return result;
  };

  const getFTSMonths = (month: string) => {
    const result = persons.filter((person) => {
      const isFMF = personIsEnrollmentActive(person, 'FMF', month);
      const isFR = personIsEnrollmentActive(person, 'FR', month);
      const isFS = personIsEnrollmentActive(person, 'FS', month);

      return isFMF || isFR || isFS;
    });

    return result;
  };

  const getAPYears = (year: string) => {
    const result = persons.filter((person) => {
      const isAP = personIsEnrollmentYearActive(person, 'AP', year);

      return isAP;
    });

    return result;
  };

  const getAPMonths = (month: string) => {
    const result = persons.filter((person) => {
      const isAP = personIsEnrollmentActive(person, 'AP', month);
      return isAP;
    });

    return result;
  };

  const getPublisherYears = (year: string) => {
    const result = persons.filter((person) => {
      const isFMF = personIsEnrollmentYearActive(person, 'FMF', year);
      const isFR = personIsEnrollmentYearActive(person, 'FR', year);
      const isFS = personIsEnrollmentYearActive(person, 'FS', year);
      const isAP = personIsEnrollmentYearActive(person, 'AP', year);

      if (isFMF || isFR || isFS || isAP) return false;

      const isPublisher = personIsPublisherYear(person, year);
      return isPublisher;
    });

    return result;
  };

  const getPublisherMonths = (month: string) => {
    const result = persons.filter((person) => {
      const isFMF = personIsEnrollmentActive(person, 'FMF', month);
      const isFR = personIsEnrollmentActive(person, 'FR', month);
      const isFS = personIsEnrollmentActive(person, 'FS', month);
      const isAP = personIsEnrollmentActive(person, 'AP', month);

      if (isFMF || isFR || isFS || isAP) return false;

      // La misma regla que el S-1 y que las listas. Con la de antes (¿el tramo
      // cubre el mes?) la estadística de publicadores y el número enviado a la
      // sucursal podían diferir hasta en 7 personas.
      return personIsActivePublisher(person, ministryMonths, month);
    });

    return result;
  };

  const getPublisherAllYears = (year: string) => {
    const result = persons.filter((person) => {
      const isPublisher = personIsPublisherYear(person, year);
      return isPublisher;
    });

    return result;
  };

  return {
    getPublishersActive,
    getPublishersInactive,
    getPublishersBaptized,
    getPublishersUnbaptized,
    getAppointedBrothers,
    getAuxiliaryPioneers,
    getRegularPioneers,
    getPublishersInactiveYears,
    getFTSYears,
    getFTSMonths,
    getAPYears,
    getAPMonths,
    getPublisherYears,
    getPublisherMonths,
    getPublisherAllYears,
  };
};

export default usePersons;
