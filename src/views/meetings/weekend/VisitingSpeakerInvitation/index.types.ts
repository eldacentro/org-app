export type CoordinatorInfo = {
  name: string;
  email: string;
  phone: string;
};

export type VisitingSpeakerInvitationProps = {
  speakerName: string;
  /**
   * La fecha del discurso en crudo, para la cápsula del periodo. `dateLocale`
   * ya viene formateada para leerse y no se puede volver a parsear.
   */
  dateRaw?: string;
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
