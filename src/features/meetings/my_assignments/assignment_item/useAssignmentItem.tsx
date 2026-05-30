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
import { AssignmentItemProps } from './index.types';
import Badge from '@components/badge';

const ADD_CALENDAR_SHOW = false;

const useAssignmentItem = ({ history }: AssignmentItemProps) => {
  const { t } = useAppTranslation();

  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const userUID = useAtomValue(userLocalUIDState);
  const dataView = useAtomValue(userDataViewState);

  const isMidweek = useMemo(() => {
    return history.assignment.key.startsWith('MM_');
  }, [history.assignment]);

  const isDept = useMemo(() => {
    return history.assignment.key.startsWith('DEPT_');
  }, [history.assignment]);

  const assignmentDate = useMemo(() => {
    try {
      const dateToUse = history.actualDate || history.weekOf;
      return formatDate(new Date(dateToUse), 'd');
    } catch {
      return formatDate(new Date(), 'd');
    }
  }, [history]);

  const badges = useMemo(() => {
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
  }, [t, dataView, history.assignment]);

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

  return {
    assignmentDate,
    isMidweek,
    isDept,
    personGetName,
    userUID,
    ADD_CALENDAR_SHOW,
    badges,
    history,
  };
};

export default useAssignmentItem;
