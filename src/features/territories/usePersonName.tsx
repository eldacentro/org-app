import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { personsState } from '@states/persons';
import { fullnameOptionState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';

/**
 * Devuelve un resolutor `(person_uid) => nombre`. Usa la tabla `persons`
 * (descifrada E2E en cliente), de modo que las asignaciones solo guardan el
 * uid opaco y el nombre nunca se duplica en claro en Firestore.
 */
export const usePersonName = () => {
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  return useCallback(
    (uid: string): string => {
      const person = persons.find((p) => p.person_uid === uid);
      if (!person) return '—';
      return buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      );
    },
    [persons, fullnameOption]
  );
};
