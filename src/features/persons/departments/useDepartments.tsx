import { useAtomValue } from 'jotai';
import { personCurrentDetailsState } from '@states/persons';
import { setPersonCurrentDetails } from '@services/states/persons';
import { DepartmentType } from '@definition/person';

const useDepartments = () => {
  const person = useAtomValue(personCurrentDetailsState);

  const handleDepartmentChange = (dept: DepartmentType) => {
    const newPerson = structuredClone(person);

    const currentDepts = [...(newPerson.person_data.departments?.value || [])];

    if (currentDepts.includes(dept)) {
      const index = currentDepts.indexOf(dept);
      currentDepts.splice(index, 1);
    } else {
      currentDepts.push(dept);
    }

    newPerson.person_data.departments = {
      value: currentDepts,
      updatedAt: new Date().toISOString(),
    };

    setPersonCurrentDetails(newPerson);
  };

  return {
    person,
    handleDepartmentChange,
  };
};

export default useDepartments;
