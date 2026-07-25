import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { personsState } from '@states/persons';
import {
  COFullnameState,
  COLastnameState,
  COSpouseNameState,
  fullnameOptionState,
} from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import {
  CO_SPOUSE_UID,
  CO_UID,
  buildCoSpouseFullname,
} from '@utils/circuit_overseer';

/**
 * Devuelve un resolutor `(person_uid) => nombre`. Usa la tabla `persons`
 * (descifrada E2E en cliente), de modo que las asignaciones solo guardan el
 * uid opaco y el nombre nunca se duplica en claro en Firestore.
 *
 * Es el ÚNICO punto del módulo donde un uid se convierte en nombre (lo usan el
 * S-13, el historial, las estadísticas, el mapa y "Mis territorios"), así que
 * aquí se resuelven también las "personas" sintéticas del superintendente de
 * circuito y su esposa — ver `@utils/circuit_overseer`.
 */
export const usePersonName = () => {
  const persons = useAtomValue(personsState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const coFullname = useAtomValue(COFullnameState);
  const coLastname = useAtomValue(COLastnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);

  return useCallback(
    (uid: string): string => {
      // El superintendente y su esposa no están en `persons` a propósito: su
      // nombre sale de Ajustes. Se resuelven ANTES del lookup porque ahí nunca
      // habrá coincidencia y caerían en "[Eliminado]".
      if (uid === CO_UID) {
        return coFullname || 'Superintendente de circuito';
      }

      if (uid === CO_SPOUSE_UID) {
        return (
          buildCoSpouseFullname(coSpouseName, coLastname, fullnameOption) ||
          'Esposa del superintendente'
        );
      }

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
    [persons, fullnameOption, coFullname, coLastname, coSpouseName]
  );
};
