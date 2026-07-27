import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { personsActiveState } from '@states/persons';
import ListByGroups from './list_by_groups';
import TabLabelWithBadge from '@components/tab_label_with_badge';
import {
  personIsActivePublisher,
  personIsInactivePublisher,
} from '@services/app/publisher_status';
import { ministryMonthsState } from '@states/field_service_reports';

const usePublisherTabs = () => {
  const { t } = useAppTranslation();

  const ministryMonths = useAtomValue(ministryMonthsState);

  const persons = useAtomValue(personsActiveState);

  /**
   * Aquí vivía otra definición propia de activo/inactivo (¿el tramo cubre este
   * mes?). Se cambió por la regla de los informes, pero se dejó filtrando la
   * POBLACIÓN por la casilla de la ficha, y eso es media definición propia que
   * seguía viva: quien es publicador por su historial pero tiene la casilla
   * apagada no salía en ninguna de las dos pestañas —desaparecía del recuento
   * sin más— y un estudiante de entresemana con la casilla puesta se contaba
   * como publicador inactivo, cuando el S-1 y los filtros de Personas no lo
   * cuentan. Hoy no discrepan porque en la congregación no hay ninguno de esos
   * dos casos, pero el número no puede depender de eso.
   *
   * La población es la de siempre: `personWasPublisherBy`, que es justo la
   * unión de activo e inactivo.
   */
  const publishers = useMemo(() => {
    const active = persons.filter((person) =>
      personIsActivePublisher(person, ministryMonths)
    );
    const inactive = persons.filter((person) =>
      personIsInactivePublisher(person, ministryMonths)
    );

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
