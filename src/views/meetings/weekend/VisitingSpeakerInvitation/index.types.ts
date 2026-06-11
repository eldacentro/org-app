export type CoordinatorInfo = {
  name: string;
  email: string;
  phone: string;
};

export type VisitingSpeakerInvitationProps = {
  speakerName: string;
  dateLocale: string;
  time: string;
  outlineNumber: string;
  outlineTitle: string;
  congregationName: string;
  congregationAddress: string;
  publicTalkCoordinator: CoordinatorInfo;
  assistants: CoordinatorInfo[];
  mediaEmail: string;
};
