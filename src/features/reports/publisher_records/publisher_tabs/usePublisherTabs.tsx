import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { personsActiveState } from '@states/persons';
import { PersonType } from '@definition/person';
import ListByGroups from './list_by_groups';
import TabLabelWithBadge from '@components/tab_label_with_badge';
import { personIsActivePublisher } from '@services/app/publisher_status';
import { ministryMonthsState } from '@states/field_service_reports';

const usePublisherTabs = () => {
  const { t } = useAppTranslation();

  const ministryMonths = useAtomValue(ministryMonthsState);

  const persons = useAtomValue(personsActiveState);

  const publishers = useMemo(() => {
    const active: PersonType[] = [];
    const inactive: PersonType[] = [];

    const current = persons.filter(
      (person) =>
        person.person_data.publisher_baptized.active.value ||
        person.person_data.publisher_unbaptized.active.value
    );

    // Aquí vivía otra definición propia de activo/inactivo (¿el tramo cubre
    // este mes?). Ahora es la de siempre: los informes de los últimos 6 meses.
    for (const person of current) {
      if (personIsActivePublisher(person, ministryMonths)) {
        active.push(person);
      } else {
        inactive.push(person);
      }
    }

    return { active: active.length, inactive: inactive.length };
  }, [persons, ministryMonths]);

  const tabs = useMemo(() => {
    return [
      {
        label: (
          <TabLabelWithBadge
            label={t('tr_activePublishers')}
            count={publishers.active}
          />
        ),
        Component: <ListByGroups type="active" />,
      },
      {
        label: (
          <TabLabelWithBadge
            label={t('tr_inactivePublishers')}
            count={publishers.inactive}
          />
        ),
        Component: <ListByGroups type="inactive" />,
      },
    ];
  }, [t, publishers]);

  return { tabs };
};

export default usePublisherTabs;
