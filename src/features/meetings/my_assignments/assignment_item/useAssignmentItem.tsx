import { JSX, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { personsState } from '@states/persons';
import { buildPersonFullname } from '@utils/common';
import {
  fullnameOptionState,
  userDataViewState,
  userLocalUIDState,
} from '@states/settings';
import { formatDate } from '@utils/date';
import { AssignmentHistoryType } from '@definition/schedules';
import { AssignmentItemProps } from './index.types';
import Badge from '@components/badge';

const ADD_CALENDAR_SHOW = false;

const useAssignmentItem = ({ items }: AssignmentItemProps) => {
  const { t } = useAppTranslation();

  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);
  const dataView = useAtomValue(userDataViewState);

  // Todos los elementos de un mismo grupo comparten fecha y categoría, así
  // que la "cara" de la tarjeta (día, número, si es de departamento) se
  // calcula una sola vez con el primero.
  const first = items[0];

  const isDept = useMemo(() => {
    return first.assignment.key?.startsWith('DEPT_') ?? false;
  }, [first.assignment]);

  const assignmentDate = useMemo(() => {
    try {
      const dateToUse = first.actualDate || first.weekOf;
      return formatDate(new Date(dateToUse), 'd');
    } catch {
      return formatDate(new Date(), 'd');
    }
  }, [first]);

  const assignmentDayName = useMemo(() => {
    const DAY_ABBREV = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    try {
      const dateToUse = first.actualDate || first.weekOf;
      const parts = dateToUse.split('/');
      if (parts.length >= 3) {
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        return DAY_ABBREV[d.getDay()];
      }
      return DAY_ABBREV[new Date(dateToUse).getDay()];
    } catch {
      return '';
    }
  }, [first]);

  const personGetName = (value: string) => {
    const person = persons.find((record) => record.person_uid === value);
    if (!person) return '';

    const name = buildPersonFullname(
      person.person_data.person_lastname.value,
      person.person_data.person_firstname.value,
      fullnameOption
    );

    return name;
  };

  const getBadges = (history: AssignmentHistoryType) => {
    const result: JSX.Element[] = [];

    if (history.assignment.dataView !== dataView) {
      result.push(
        <Badge
          key="assignment-dataView"
          text={
            dataView === 'main'
              ? t('tr_languageGroupShort')
              : t('tr_hostCongregationShort')
          }
          color={dataView === 'main' ? 'red' : 'green'}
          size="medium"
          centerContent
        />
      );
    }

    return result;
  };

  const rows = useMemo(() => {
    return items.map((history) => ({
      history,
      badges: getBadges(history),
      isDept: history.assignment.key?.startsWith('DEPT_') ?? false,
    }));
  }, [items, dataView, t]);

  return {
    assignmentDate,
    assignmentDayName,
    isDept,
    rows,
    personGetName,
    userUID,
    ADD_CALENDAR_SHOW,
  };
};

export default useAssignmentItem;
