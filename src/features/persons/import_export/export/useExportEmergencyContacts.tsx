import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { IconError } from '@components/icons';
import { getMessageByCode } from '@services/i18n/translation';
import { displaySnackNotification } from '@services/states/app';
import { personsActiveState } from '@states/persons';
import { fieldGroupsState } from '@states/field_service_groups';
import { congNameState, publishersSortState } from '@states/settings';
import { PublishersSortOption } from '@definition/settings';
import { fieldGroupsSortMembersByName } from '@services/app/field_service_groups';
import usePerson from '@features/persons/hooks/usePerson';
import { TemplateEmergencyContacts } from '@views/index';
import type {
  EmergencyContactsGroupType,
  PersonContactEntry,
} from '@views/persons/emergency_contacts/index.types';

const useExportEmergencyContacts = () => {
  const { getName, personIsPublisher } = usePerson();

  const groups = useAtomValue(fieldGroupsState);
  const persons = useAtomValue(personsActiveState);
  const congName = useAtomValue(congNameState);
  const sortMethod = useAtomValue(publishersSortState);

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

      const formattedGroups: EmergencyContactsGroupType[] = groups.map(
        (record) => {
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
            if (!personIsPublisher(person)) continue;

            assignedUids.add(person.person_uid);
            memberEntries.push(buildEntry(person));
          }

          return { group_name, members: memberEntries };
        }
      );

      const unassigned = persons
        .filter((person) => personIsPublisher(person))
        .filter((person) => !assignedUids.has(person.person_uid))
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
