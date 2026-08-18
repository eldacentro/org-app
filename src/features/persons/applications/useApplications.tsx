import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { APRecordType } from '@definition/ministry';
import { PersonType } from '@definition/person';
import {
  applicationsApprovedState,
  applicationsNewState,
  personsActiveState,
  personsState,
} from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { personIsEnrollmentActive } from '@services/app/persons';
import { buildPersonFullname } from '@utils/common';
import { formatDate } from '@utils/date';
import ListItems from './list_items';
import CurrentPioneers from './current_pioneers';

const useApplications = () => {
  const { t } = useAppTranslation();

  const applications_new = useAtomValue(applicationsNewState);
  const applications_approved = useAtomValue(applicationsApprovedState);
  const persons = useAtomValue(personsState);
  const persons_active = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [search, setSearch] = useState('');
  const [currentTab, setCurrentTab] = useState(0);

  /**
   * El filtro del buscador, tolerante a que el solicitante ya no esté.
   *
   * Antes esto hacía `persons.find(...).person_data.person_firstname.value`
   * a pelo: si al hermano lo habían borrado o archivado —cosa que pasa, se
   * borró y se restauró a una familia entera esta semana— la página entera
   * reventaba en vez de enseñar la solicitud huérfana. Ahora la solicitud sin
   * persona sigue apareciendo (que es justo lo que hay que ver para poder
   * atenderla), y solo se esconde si hay una búsqueda escrita con la que no
   * puede casar.
   */
  const filterBySearch = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();

    return (application: APRecordType) => {
      if (needle.length === 0) return true;

      const person = persons.find(
        (record) => record.person_uid === application.person_uid
      );

      if (!person) return false;

      const firstname =
        person.person_data.person_firstname?.value?.toLocaleLowerCase() ?? '';
      const lastname =
        person.person_data.person_lastname?.value?.toLocaleLowerCase() ?? '';

      return firstname.includes(needle) || lastname.includes(needle);
    };
  }, [search, persons]);

  const applications = useMemo(() => {
    const result: APRecordType[] = [];

    if (currentTab === 0) {
      result.push(...applications_new.filter(filterBySearch));
    }

    if (currentTab === 1) {
      result.push(...applications_approved.filter(filterBySearch));
    }

    return result;
  }, [filterBySearch, applications_new, applications_approved, currentTab]);

  /**
   * Quién está sirviendo de precursor auxiliar ESTE mes.
   *
   * No sale de las solicitudes, sino de la inscripción que la aprobación deja
   * en la persona (`enrollments`, tipo 'AP'): así aparece también quien se
   * nombró a mano sin pasar por una solicitud, que es lo que de verdad
   * responde a "¿quién es precursor auxiliar este mes?".
   */
  const currentPioneers = useMemo(() => {
    const month = formatDate(new Date(), 'yyyy/MM');
    const needle = search.trim().toLocaleLowerCase();

    const matches = (person: PersonType) => {
      if (needle.length === 0) return true;

      const firstname =
        person.person_data.person_firstname?.value?.toLocaleLowerCase() ?? '';
      const lastname =
        person.person_data.person_lastname?.value?.toLocaleLowerCase() ?? '';

      return firstname.includes(needle) || lastname.includes(needle);
    };

    return persons_active
      .filter((person) => personIsEnrollmentActive(person, 'AP', month))
      .filter(matches)
      .map((person) => ({
        person_uid: person.person_uid,
        name: buildPersonFullname(
          person.person_data.person_lastname?.value ?? '',
          person.person_data.person_firstname?.value ?? '',
          fullnameOption
        ),
        female: person.person_data.female?.value ?? false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [persons_active, search, fullnameOption]);

  // En "Este mes" no se cuentan solicitudes sino personas sirviendo, así que
  // el rótulo cambia con la pestaña — si no, decía "Solicitudes: 2" encima de
  // una lista que no son solicitudes.
  const countLabel = useMemo(() => {
    if (currentTab === 2) {
      return t('tr_auxiliaryPioneersAmount', {
        amount: currentPioneers.length.toString(),
      });
    }

    return t('tr_applicationsAmount', {
      amount: applications.length.toString(),
    });
  }, [t, applications, currentPioneers, currentTab]);

  const tabs = useMemo(() => {
    return [
      {
        label: t('tr_newApplications'),
        Component: <ListItems applications={applications} />,
      },
      {
        label: t('tr_approved'),
        Component: <ListItems applications={applications} />,
      },
      {
        label: t('tr_currentAuxiliaryPioneers'),
        Component: <CurrentPioneers pioneers={currentPioneers} />,
      },
    ];
  }, [t, applications, currentPioneers]);

  const handleSearchChange = (value: string) => setSearch(value);

  const handleTabChange = (value: number) => setCurrentTab(value);

  return {
    countLabel,
    search,
    handleSearchChange,
    tabs,
    currentTab,
    handleTabChange,
  };
};

export default useApplications;
