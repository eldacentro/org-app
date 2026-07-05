export type EmergencyContactEntry = {
  name: string;
  contact: string;
};

export type PersonContactEntry = {
  name: string;
  phone: string;
  address: string;
  emergencyContacts: EmergencyContactEntry[];
};

export type EmergencyContactsGroupType = {
  group_name: string;
  members: PersonContactEntry[];
};

export type CircuitOverseerContact = {
  name: string;
  phone: string;
  email: string;
};

export type TemplateEmergencyContactsProps = {
  groups: EmergencyContactsGroupType[];
  unassigned: PersonContactEntry[];
  congregation: string;
  generatedAt: string;
  coContact?: CircuitOverseerContact;
};

export type ECGroupPageProps = {
  group: EmergencyContactsGroupType;
  congregation: string;
  generatedAt: string;
  coContact?: CircuitOverseerContact;
};

export type ECMemberProps = {
  member: PersonContactEntry;
};
