import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { PersonType } from '@definition/person';
import { userMembersDelegateState } from '@states/settings';
import { personsActiveState } from '@states/persons';
import { reportUserSelectedMonthState } from '@states/user_field_service_reports';
import { personWasPublisherBy } from '@services/app/publisher_status';

const useDelegateReports = () => {

  const persons = useAtomValue(personsActiveState);
  const delegatedPersons = useAtomValue(userMembersDelegateState);
  const month = useAtomValue(reportUserSelectedMonthState);

  const [open, setOpen] = useState(false);

  const publishers = useMemo(() => {
    const result: PersonType[] = [];

    for (const person of delegatedPersons) {
      const findPerson = persons.find((record) => record.person_uid === person);

      if (!findPerson) continue;

      // Ser publicador, no "tener el tramo abierto este mes": si no, a quien
      // tiene el tramo cerrado no se le puede entregar el informe delegado.
      const isPublisher = personWasPublisherBy(findPerson, month);

      if (isPublisher) {
        result.push(findPerson);
      }
    }

    return result.sort((a, b) =>
      a.person_data.person_firstname.value.localeCompare(
        b.person_data.person_firstname.value
      )
    );
  }, [delegatedPersons, persons, month]);

  const handleToggleCollapse = () => setOpen((prev) => !prev);

  return { publishers, handleToggleCollapse, open };
};

export default useDelegateReports;
