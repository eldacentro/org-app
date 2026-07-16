import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { personCurrentDetailsState } from '@states/persons';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { setPersonCurrentDetails } from '@services/states/persons';
import { personIsInactive } from '@services/app/persons';

/**
 * Grupo de la persona a efectos de organización interna (PDF de contactos de
 * emergencia, superintendente de grupo). Dos fuentes, en este orden:
 *
 * 1. Pertenencia real a un grupo de "Grupos de predicación" — manda siempre.
 * 2. `grupo_asignado` (manual, solo cuando NO es miembro real de ninguno) —
 *    p. ej. una persona inactiva que se quitó de la vista pública pero cuyo
 *    superintendente de grupo debe seguir teniéndola en su lista.
 */
const useFieldGroup = () => {
  const person = useAtomValue(personCurrentDetailsState);

  // Atom crudo a propósito: los atoms derivados filtran miembros según el rol
  // del usuario, y aquí necesitamos la pertenencia real sin filtrar.
  const allGroups = useAtomValue(fieldServiceGroupsState);

  const groups = useMemo(() => {
    return allGroups
      .filter(
        (record) =>
          !record.group_data._deleted && !record.group_data.language_group
      )
      .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index)
      .map((record) => ({
        group_id: record.group_id,
        name:
          record.group_data.name.length > 0
            ? record.group_data.name
            : `Grupo ${record.group_data.sort_index + 1}`,
        members: record.group_data.members,
      }));
  }, [allGroups]);

  const memberGroup = useMemo(() => {
    return (
      groups.find((group) =>
        group.members.some(
          (member) => member.person_uid === person.person_uid
        )
      ) ?? null
    );
  }, [groups, person.person_uid]);

  const assignedGroupId = person.person_data.grupo_asignado?.value ?? '';

  const assignedGroup = useMemo(() => {
    if (!assignedGroupId) return null;
    return groups.find((group) => group.group_id === assignedGroupId) ?? null;
  }, [groups, assignedGroupId]);

  const isInactive = useMemo(() => {
    const isPublisherFlagged =
      person.person_data.publisher_baptized.active.value ||
      person.person_data.publisher_unbaptized.active.value;

    return isPublisherFlagged && personIsInactive(person);
  }, [person]);

  const hasConcession =
    person.person_data.grupo_visible_inactivo?.value ?? false;

  const handleChangeAssignedGroup = (groupId: string) => {
    const newPerson = structuredClone(person);

    // '' = sin asignar. Nunca borrar la clave (el merge de sync por updatedAt
    // necesita el objeto presente para propagar el borrado a otros equipos).
    newPerson.person_data.grupo_asignado = {
      value: groupId,
      updatedAt: new Date().toISOString(),
    };

    setPersonCurrentDetails(newPerson);
  };

  return {
    groups,
    memberGroup,
    assignedGroup,
    assignedGroupId,
    isInactive,
    hasConcession,
    handleChangeAssignedGroup,
  };
};

export default useFieldGroup;
