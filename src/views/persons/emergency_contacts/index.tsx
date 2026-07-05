import { Document } from '@views/components';
import { TemplateEmergencyContactsProps } from './index.types';
import ECGroupPage from './ECGroupPage';

const TemplateEmergencyContacts = ({
  groups,
  unassigned,
  congregation,
  generatedAt,
  coContact,
}: TemplateEmergencyContactsProps) => {
  const allGroups = [...groups];
  if (unassigned.length > 0) {
    allGroups.push({ group_name: 'Sin grupo asignado', members: unassigned });
  }

  return (
    <Document title="Contactos de emergencia" lang="es">
      {allGroups.map((group, i) => (
        <ECGroupPage
          key={group.group_name + i}
          group={group}
          congregation={congregation}
          generatedAt={generatedAt}
          coContact={coContact}
        />
      ))}
    </Document>
  );
};

export default TemplateEmergencyContacts;
