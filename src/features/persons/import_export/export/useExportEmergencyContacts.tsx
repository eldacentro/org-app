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
import { TemplateEmergencyContacts } from '@views/index';
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

      const formattedGroups: EmergencyContactsGroupType[] = groups.map(
        (record, groupIndex) => {
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

          const memberEntries: PersonContactEntry[] = [];

          for (const member of members) {
            const person = persons.find(
              (p) => p.person_uid === member.person_uid
            );

            if (!person) continue;

            assignedUids.add(person.person_uid);
            personUidToGroupIndex.set(person.person_uid, groupIndex);
            memberEntries.push(buildEntry(person));
          }

          return { group_name, members: memberEntries };
        }
      );

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
          formattedGroups[headGroupIndex].members.push(buildEntry(person));
          assignedUids.add(person.person_uid);
        } else {
          stillUnassigned.push(person);
        }
      }

      const unassigned = stillUnassigned
        .sort((a, b) => getName(a).localeCompare(getName(b)))
        .map((person) => buildEntry(person));

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear());
      const generatedAt = `${dd}/${mm}/${yy}`;

      const blob = await pdf(
        <TemplateEmergencyContacts
          groups={formattedGroups}
          unassigned={unassigned}
          congregation={congName}
          generatedAt={generatedAt}
          coContact={{ name: coFullname, phone: coPhone, email: coEmail }}
        />
      ).toBlob();

      const filename = `Contactos-Emergencia-${dd}-${mm}-${yy}.pdf`;

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
