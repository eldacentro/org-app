import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { personsState, personsTrashState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { MESES_ES } from '@utils/nombres_fecha';

/**
 * «1 de agosto de 2026, 20:41».
 *
 * Con los meses de la casa y no con `toLocaleDateString`, que se va al idioma
 * del NAVEGADOR: en un Chrome en inglés saldría «August 1» dentro de una frase
 * en español. La hora entra porque en una papelera la pregunta suele ser «¿esto
 * fue antes o después de lo otro?», y dos borrados del mismo día sin hora no se
 * pueden ordenar a ojo.
 */
export const formatDeletedAt = (value: string) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const hora = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;

  return `${date.getDate()} de ${
    MESES_ES[date.getMonth()]
  } de ${date.getFullYear()}, ${hora}`;
};

const useTrash = () => {
  const entries = useAtomValue(personsTrashState);
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  /**
   * El nombre de quien borró, resuelto desde su `person_uid`.
   *
   * Se mira sobre `personsState` en crudo —con los borrados dentro— porque
   * quien borró a alguien puede estar él mismo en la papelera, y ahí la
   * respuesta sigue siendo útil.
   */
  const resolveName = useMemo(() => {
    const byUid = new Map(persons.map((person) => [person.person_uid, person]));

    return (uid: string) => {
      if (!uid) return '';

      const person = byUid.get(uid);

      if (!person) return '';

      return buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      );
    };
  }, [persons, fullnameOption]);

  return { entries, resolveName, fullnameOption };
};

export default useTrash;
