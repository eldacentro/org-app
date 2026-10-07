/**
 * LA INVITACIÓN AL ORADOR VISITANTE, la que él abre desde su carta.
 *
 * Vive en Firestore y NO en la sincronización cifrada de extremo a extremo, por
 * la misma razón que los enlaces de territorio: quien la abre no tiene cuenta
 * en la aplicación ni clave de la congregación. Es un orador de otra
 * congregación con un enlace en el móvil.
 *
 * Lo que guarda es lo que ya dice la carta que se le manda —su nombre, la
 * fecha, la hora, el discurso y la dirección del Salón—, así que va en claro: no
 * hay nada de terceros, ni teléfonos ni correos de nadie más. Lo que lo protege
 * es que el identificador del documento son 128 bits aleatorios, que caduca, y
 * que la colección no se puede enumerar sin sesión.
 */
export type SpeakerInvitationType = {
  /** El token del enlace. Es también el ID del documento. */
  token: string;

  /** A qué semana y a quién pertenece, para encontrarla desde la app. */
  weekOf: string;
  speakerUid: string;

  /** Lo que ve el orador al abrirla. */
  speakerName: string;
  congName: string;
  congAddress: string;
  dateLocale: string;
  time: string;
  talkNumber: string;
  talkTitle: string;
  /** Si se le ha asignado además la oración final. */
  closingPrayer: boolean;

  /** Hasta cuándo vale el enlace. */
  expiresAt: Date;
  revoked: boolean;

  /** Lo que conteste. Mientras no conteste, no existe. */
  respuesta?: SpeakerAnswerType;
};

export type SpeakerAnswerType = {
  asistira: boolean;
  cena: boolean;
  /** Cuántos cenarán en total, él incluido. 0 si no se quedan. */
  comensales: number;
  comentario: string;
  respondidoEl: string;
};

/**
 * CON QUIÉN CENA, que es cosa de la congregación y no del orador.
 *
 * Vive en una subcolección aparte que exige sesión: el documento de la
 * invitación se lee sin autenticar, así que esto allí se lo llevaría quien
 * tuviera el enlace. Y guarda el IDENTIFICADOR de la familia, no su nombre — el
 * nombre lo resuelve la app en el dispositivo.
 */
export type SpeakerDinnerType = {
  /** `person_uid` de quien acoge. Vacío = todavía sin decidir. */
  familiaUid: string;
  /** Lo que haga falta recordar: alergias, que recogen ellos, la hora… */
  notas: string;
  updatedAt: string;
};

/**
 * LA ROTACIÓN DE CENAS: a qué grupo le toca acoger cada semana.
 *
 * Misma forma que la de Limpieza y, a propósito, el MISMO motor
 * (`calcularGrupoReunion`): ya sabe saltar las semanas sin reunión, respetar un
 * cambio puesto a mano y repartir las vueltas. Un segundo motor que hiciera
 * casi lo mismo acabaría comportándose distinto en los bordes raros, que es
 * justo donde duele.
 *
 * Vive en Firestore con la invitación y no en la sincronización cifrada: son
 * identificadores de grupo y una fecha, y así el módulo entero del orador está
 * en un sitio.
 */
export type SpeakerDinnerRotationType = {
  /** Desde cuándo cuenta la rotación. Vacío = no hay rotación puesta. */
  fechaInicio: string;
  /** Con qué grupo empieza. */
  grupoInicio: string;
  /** Qué grupos entran en la rotación. Vacío = todos. */
  gruposParticipantes: string[];
  /** Cambios a mano: «YYYY/MM/DD-weekend» → group_id. */
  overrides?: Record<string, string>;
  updatedAt: string;
};
