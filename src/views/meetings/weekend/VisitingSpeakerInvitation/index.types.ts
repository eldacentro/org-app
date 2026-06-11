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
  assistantCoordinator: CoordinatorInfo;
  congregationCoordinator: CoordinatorInfo;
  mediaEmail: string;
};
