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
      // Un guion suelto no dice nada: el registro histórico de territorios
      // conserva asignaciones de hermanos que ya se borraron de la lista de
      // personas (mudanza, etc.), y en el S-13 y el historial hay que poder
      // distinguir "persona borrada" de "campo vacío".
      if (!person) return '[Eliminado]';
      return buildPersonFullname(
        person.person_data.person_lastname.value,
        person.person_data.person_firstname.value,
        fullnameOption
      );
    },
    [persons, fullnameOption]
  );
};
