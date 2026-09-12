import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { IconError } from '@components/icons';
import { getMessageByCode } from '@services/i18n/translation';
import { displaySnackNotification } from '@services/states/app';
import { personsAllState } from '@states/persons';
import { fieldGroupsState } from '@states/field_service_groups';
import {
  congNameState,
  publishersSortState,
  COFullnameState,
  COPhoneState,
  COEmailState,
} from '@states/settings';
import { PublishersSortOption } from '@definition/settings';
import { fieldGroupsSortMembersByName } from '@services/app/field_service_groups';
import usePerson from '@features/persons/hooks/usePerson';
import type { PersonType } from '@definition/person';
import { ordenarPorFamilias } from '@services/app/ordenar_por_familias';
import { TemplateEmergencyContacts } from '@views/index';
import { diaArchivo, nombreArchivo } from '@utils/nombre_pdf';
import type {
  EmergencyContactsGroupType,
  PersonContactEntry,
} from '@views/persons/emergency_contacts/index.types';

const useExportEmergencyContacts = () => {
  const { getName } = usePerson();

  const groups = useAtomValue(fieldGroupsState);
  const persons = useAtomValue(personsAllState);
  const congName = useAtomValue(congNameState);
  const sortMethod = useAtomValue(publishersSortState);
  const coFullname = useAtomValue(COFullnameState);
  const coPhone = useAtomValue(COPhoneState);
  const coEmail = useAtomValue(COEmailState);

  const [isProcessing, setIsProcessing] = useState(false);

  const buildEntry = (person: (typeof persons)[number]): PersonContactEntry => {
    const emergencyContacts = person.person_data.emergency_contacts
      .filter((record) => !record._deleted)
      .filter((record) => record.name.length > 0 || record.contact.length > 0)
      .map((record) => ({ name: record.name, contact: record.contact }));

    return {
      name: getName(person),
      phone: person.person_data.phone.value,
      address: person.person_data.address.value,
      emergencyContacts,
    };
  };

  const handleExport = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      const assignedUids = new Set<string>();
      const personUidToGroupIndex = new Map<string, number>();
      const groupIdToIndex = new Map<string, number>();

      const formattedGroups = groups.map((record, groupIndex) => {
        groupIdToIndex.set(record.group_id, groupIndex);

        const group_name =
          record.group_data.name.length > 0
            ? record.group_data.name
            : `Grupo ${record.group_data.sort_index + 1}`;

        let members = record.group_data.members
          .slice()
          .sort((a, b) => a.sort_index - b.sort_index);

        if (sortMethod === PublishersSortOption.ALPHABETICAL) {
          members = fieldGroupsSortMembersByName(members);
        }

        const personas: PersonType[] = [];

        for (const member of members) {
          const person = persons.find(
            (p) => p.person_uid === member.person_uid
          );

          if (!person) continue;

          assignedUids.add(person.person_uid);
          personUidToGroupIndex.set(person.person_uid, groupIndex);
          personas.push(person);
        }

        return { group_name, personas };
      });

      // Grupo asignado manualmente en el perfil (organización interna):
      // quien no sea miembro real de ningún grupo pero tenga un
      // grupo_asignado sale en ese grupo. Va ANTES de la heurística familiar
      // porque una asignación explícita manda sobre una deducción, y se
      // registra en personUidToGroupIndex para que su familia también le
      // siga a ese grupo.
      for (const person of persons) {
        if (assignedUids.has(person.person_uid)) continue;

        const assignedGroupId = person.person_data.grupo_asignado?.value;
        if (!assignedGroupId) continue;

        const groupIndex = groupIdToIndex.get(assignedGroupId);
        if (groupIndex === undefined) continue;

        formattedGroups[groupIndex].personas.push(person);
        assignedUids.add(person.person_uid);
        personUidToGroupIndex.set(person.person_uid, groupIndex);
      }

      // Todos deben salir en el PDF, tengan o no grupo propio (estudiantes
      // de entre semana, archivados, etc.). Quien no tenga grupo propio
      // pero sí pertenezca a una familia cuyo cabeza SÍ tiene grupo, se
      // añade a ese mismo grupo — regla general, no solo para estudiantes.
      // Solo cae en "Sin grupo asignado" quien de verdad no tenga ninguna
      // relación de grupo, ni propia ni por familia.
      const stillUnassigned: (typeof persons)[number][] = [];

      for (const person of persons) {
        if (assignedUids.has(person.person_uid)) continue;

        const familyHead = persons.find((p) =>
          p.person_data.family_members?.members.includes(person.person_uid)
        );

        const headGroupIndex = familyHead
          ? personUidToGroupIndex.get(familyHead.person_uid)
          : undefined;

        if (headGroupIndex !== undefined) {
          formattedGroups[headGroupIndex].personas.push(person);
          assignedUids.add(person.person_uid);
        } else {
          stillUnassigned.push(person);
        }
      }

      // POR FAMILIAS, y solo en este PDF. Hasta aquí cada hoja lleva el orden
      // de Grupos de predicación, que es el que pone a mano el superintendente
      // de grupo; para buscar a quién llamar en una urgencia sirve más ver a
      // cada familia seguida, con el cabeza delante.
      //
      // Va al FINAL a propósito: así sube también junto a los suyos quien se
      // ha añadido arriba por no tener grupo propio (un hijo estudiante, por
      // ejemplo), que antes quedaba al final de la hoja, lejos de sus padres.
      // Nadie cambia de hoja. El PDF de Grupos de predicación no pasa por aquí
      // y conserva su orden.
      const groupsForPdf: EmergencyContactsGroupType[] = formattedGroups.map(
        ({ group_name, personas }) => ({
          group_name,
          members: ordenarPorFamilias(personas, persons).map(buildEntry),
        })
      );

      // Los que no tienen grupo, por nombre como siempre, pero también con
      // cada familia seguida.
      const unassigned = ordenarPorFamilias(
        stillUnassigned.sort((a, b) => getName(a).localeCompare(getName(b))),
        persons
      ).map(buildEntry);

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear());
      const generatedAt = `${dd}/${mm}/${yy}`;

      const blob = await pdf(
        <TemplateEmergencyContacts
          groups={groupsForPdf}
          unassigned={unassigned}
          congregation={congName}
          generatedAt={generatedAt}
          coContact={{ name: coFullname, phone: coPhone, email: coEmail }}
        />
      ).toBlob();

      const filename = nombreArchivo(
        'Contactos de emergencia',
        diaArchivo(new Date())
      );

      saveAs(blob, filename);

      setIsProcessing(false);
    } catch (error) {
      console.error(error);

      setIsProcessing(false);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
        icon: <IconError color="var(--card)" />,
      });
    }
  };

  return { handleExport, isProcessing };
};

export default useExportEmergencyContacts;
