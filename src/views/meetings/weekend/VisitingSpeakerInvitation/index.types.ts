export type CoordinatorInfo = {
  name: string;
  email: string;
  phone: string;
};

export type VisitingSpeakerInvitationProps = {
  speakerName: string;
  /** Su congregación, para la línea secundaria de la cabecera. */
  speakerCongregation?: string;
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

  /**
   * ¿Se le ha asignado además la ORACIÓN FINAL de la reunión?
   *
   * Sale del programa de esa semana, no de un texto fijo: la carta solo lo dice
   * cuando es verdad. Una carta que asigna una oración que luego no aparece en
   * el programa es peor que no decir nada.
   */
  closingPrayer?: boolean;

  /**
   * La cena con una familia después de la reunión. Si no hay a dónde contestar
   * —ni enlace ni correo—, el bloque entero no sale: invitar a cenar sin decir
   * cómo confirmar es dejar el trabajo a medias.
   */
  dinner?: {
    /** La página donde contesta con dos toques, si la hay. */
    url?: string;
    /** El correo de toda la vida, para quien prefiera contestar así. */
    email?: string;
  };

  /**
   * A quién se le pasan los gastos de combustible: el coordinador del cuerpo de
   * ancianos y, en su ausencia, quien conduce el estudio de La Atalaya.
   */
  expenses?: { coordinator: string; fallback: string };
};
