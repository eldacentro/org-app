import { AssignmentCode, AssignmentFieldType } from './assignment';
import { Week } from './week_type';

export type S89TemplateType = 'S89_1x1' | 'S89_4x1';

export type AssignmentCongregation = {
  type: string;
  name: string;
  value: string;
  updatedAt: string;
  solo?: boolean;
  id?: string;
  _deleted?: true;
  /**
   * La hojita de asignación (S-89) se entregó y la persona la aceptó.
   *
   * Vive DENTRO de la asignación, y no en una tabla aparte, porque pertenece
   * al par parte+persona y tiene que morir con él: al reasignar la parte a
   * otro hermano, la confirmación del anterior no significa nada. La fusión de
   * la sincronización reemplaza este objeto entero por el más reciente, así
   * que eso sale gratis — y `schedulesSaveAssignment` lo borra explícitamente
   * al cambiar de persona, para que tampoco dependa de la carrera.
   *
   * Solo se usa en las asignaciones que llevan hojita: ver `S89_ASSIGNMENTS`.
   */
  /**
   * La congregación del orador visitante, copiada aquí dentro.
   *
   * Igual que `name`, y por el mismo motivo. El catálogo de oradores y sus
   * congregaciones (`visiting_speakers`, `speakers_congregations`) va cifrado
   * con la LLAVE MAESTRA, y un publicador no la tiene ni debe tenerla: aunque se
   * le mandaran esas tablas no podría leerlas. Se intentó, y lo que consiguió
   * fue un error en su pantalla — el campo llegaba sin descifrar.
   *
   * El programa, en cambio, va cifrado con el código de acceso, que tienen
   * todos. Así que lo que tiene que ver todo el mundo se copia AQUÍ: el nombre
   * ya se hacía así, y la congregación es la otra mitad de la misma línea del
   * programa. Sin ella, al publicador le salía el orador «de ninguna parte».
   *
   * Se rellena al asignar, y `dbBackfillSpeakerCongregation` la pone una sola
   * vez en las semanas que ya estaban guardadas.
   */
  congregation?: string;
  confirmed?: boolean;
  /**
   * Cuándo se puso o se quitó la marca de la hojita.
   *
   * Existe SOLO para poder distinguir «lo último que le pasó a esta asignación
   * fue confirmar la hojita» de «alguien cambió el programa». Confirmar tiene
   * que sellar `updatedAt` como cualquier otra edición —si no, la marca no
   * ganaría la fusión y no llegaría a los demás dispositivos—, pero entonces la
   * cuenta de «cambios desde que se publicó» la contaba como un cambio del
   * programa, y no lo es: a quién se le ha entregado la hojita no le cambia
   * nada al resto de la congregación, solo lo miramos quienes lo repartimos.
   *
   * Cuando las dos fechas coinciden, el último toque fue la confirmación. En
   * cuanto se edite cualquier otra cosa, `updatedAt` avanza y dejan de
   * coincidir, así que ese cambio sí se cuenta. Se borra junto con `confirmed`
   * al reasignar la parte a otra persona.
   */
  confirmedAt?: string;
  /**
   * Quién puso este valor, por su nombre.
   *
   * El registro de la semana ya guarda un `lastModifiedBy`, pero es el del
   * ÚLTIMO que guardó cualquier cosa: con él, el panel de «Última
   * actualización» solo podía decir «se tocó todo esto y el último fue Fulano»,
   * que en la práctica no es saber nada.
   *
   * Aquí el autor viaja pegado al campo que cambió, así que se puede contestar
   * la pregunta de verdad: quién cambió el presidente, y a qué hora.
   *
   * Opcional a propósito: todo lo repartido antes de esto no lo lleva, y el
   * panel lo dice —«no consta quién»— en vez de atribuirle el cambio al último
   * que guardó, que sería inventárselo.
   *
   * En la fusión viaja gratis: estos objetos se reemplazan enteros por el más
   * reciente (casan por `type` y deciden por `updatedAt`), así que un campo
   * nuevo dentro no tiene ningún filo.
   */
  by?: string;
};

export type WeekTypeCongregation = {
  type: string;
  value: Week;
  updatedAt: string;
};

export type CanceledCongregation = {
  type: string;
  value: boolean;
  updatedAt: string;
};

/**
 * Borrador / publicado, por vista de datos.
 *
 * Misma forma que `canceled` a propósito: un booleano suelto dentro de la
 * semana lo gana siempre el servidor en la fusión (`syncFromRemote` no mira
 * fechas en los primitivos), y un "publicado" que se revierte solo deja a la
 * congregación sin ver un mes que ya estaba fuera. Con `{type, value,
 * updatedAt}` la fusión casa por `type` y gana la marca más reciente.
 *
 * Ver `services/app/meetings_publish.ts`.
 */
export type PublishedCongregation = {
  type: string;
  value: boolean;
  updatedAt: string;
};

export type AssignmentAYFType = {
  main_hall: {
    student: AssignmentCongregation[];
    assistant: AssignmentCongregation[];
  };
  aux_class_1: {
    student: AssignmentCongregation;
    assistant: AssignmentCongregation;
  };
  aux_class_2: {
    student: AssignmentCongregation;
    assistant: AssignmentCongregation;
  };
};

export type PublicTalkType =
  | 'localSpeaker'
  | 'visitingSpeaker'
  | 'jwStreamRecording'
  | 'host'
  | 'group';

export type PublicTalkCongregation = {
  type: string;
  value: PublicTalkType;
  updatedAt: string;
};

export type OutgoingTalkScheduleType = {
  _deleted: boolean;
  updatedAt: string;
  id: string;
  synced: boolean;
  opening_song: string;
  /** null = sin discurso asignado. Se usa null y no undefined porque los
   *  undefined desaparecen en el JSON.stringify del cifrado E2E y el
   *  "borrado" nunca llegaría a los demás dispositivos. */
  public_talk: number | null;
  value: string;
  /** Nombre desnormalizado del orador (`value`) al momento de asignarlo —
   *  igual que ya hace el resto de asignaciones (ver `assigned.name` en
   *  schedulesSaveAssignment). Sin esto, si el registro de la persona/orador
   *  se borra más tarde, el discurso saliente se queda en blanco para
   *  siempre sin forma de saber quién era. */
  personName?: string;
  type: string;
  congregation: {
    name: string;
    number: string;
    country: string;
    address: string;
    weekday: number;
    time: string;
  };
};

export type OutgoingTalkExportScheduleType = OutgoingTalkScheduleType & {
  sender: string;
  recipient: string;
  weekOf: string;
};

export type SchedWeekType = {
  weekOf: string;
  updatedAt?: string;
  lastModifiedBy?: string;
  midweek_meeting: {
    chairman: {
      main_hall: AssignmentCongregation[];
      aux_class_1: AssignmentCongregation;
    };
    opening_prayer: AssignmentCongregation[];
    tgw_talk: AssignmentCongregation[];
    tgw_gems: AssignmentCongregation[];
    tgw_bible_reading: {
      main_hall: AssignmentCongregation[];
      aux_class_1: AssignmentCongregation;
      aux_class_2: AssignmentCongregation;
    };
    ayf_part1: AssignmentAYFType;
    ayf_part2: AssignmentAYFType;
    ayf_part3: AssignmentAYFType;
    ayf_part4: AssignmentAYFType;
    lc_part1: AssignmentCongregation[];
    lc_part2: AssignmentCongregation[];
    lc_part3: AssignmentCongregation[];
    lc_cbs: {
      conductor: AssignmentCongregation[];
      reader: AssignmentCongregation[];
    };
    closing_prayer: AssignmentCongregation[];
    circuit_overseer: AssignmentCongregation;
    aux_fsg?: { value: string; updatedAt: string };
    week_type: WeekTypeCongregation[];
    canceled: CanceledCongregation[];
    /** ¿Publicado este mes de la reunión de entre semana? Ver meetings_publish. */
    published?: PublishedCongregation[];
  };
  weekend_meeting: {
    chairman: AssignmentCongregation[];
    opening_prayer: AssignmentCongregation[];
    public_talk_type: PublicTalkCongregation[];
    speaker: {
      part_1: AssignmentCongregation[];
      part_2: AssignmentCongregation[];
      substitute: AssignmentCongregation[];
    };
    wt_study: {
      conductor: AssignmentCongregation[];
      reader: AssignmentCongregation[];
    };
    closing_prayer: AssignmentCongregation[];
    circuit_overseer: AssignmentCongregation;
    week_type: WeekTypeCongregation[];
    outgoing_talks: OutgoingTalkScheduleType[];
    canceled: CanceledCongregation[];
    /** ¿Publicado este mes de la reunión de fin de semana? */
    published?: PublishedCongregation[];
    /**
     * ¿Publicado este mes de los discursos salientes?
     *
     * Aparte del anterior porque son otro programa y otro responsable (el
     * coordinador de discursos públicos), aunque vivan en la misma semana.
     */
    outgoing_talks_published?: PublishedCongregation[];
  };
};

/** Línea de detalle secundaria de "Mis asignaciones" (hora, lugar,
 *  compañeros...) — antes Departamentos/Salidas/Exhibidores/Limpieza/Visita
 *  del CO armaban un único string con emojis concatenados
 *  ("🕒 18:00 • 📍 Salón del Reino"); ahora cada dato es su propia línea con
 *  su propio icono, igual que el resto de la app. `desc` (string) se
 *  mantiene aparte: lo sigue usando el historial de asignaciones normales de
 *  reunión (p. ej. la descripción de una parte de Vivamos como cristianos,
 *  tomada tal cual del contenido de JW.org), que no es parte de este rediseño. */
export type AssignmentDescItem = {
  icon: 'clock' | 'location' | 'people' | 'person' | 'clean' | 'meal';
  text: string;
};

export type AssignmentHistoryType = {
  id: string;
  weekOf: string;
  weekOfFormatted?: string;
  actualDate?: string;
  assignment: {
    key?: AssignmentFieldType;
    code: AssignmentCode;
    title: string;
    src?: string;
    desc?: string;
    descItems?: AssignmentDescItem[];
    person: string;
    dataView: string;
    classroom?: string;
    schedule_id?: string;
    public_talk?: number;
    ayf?: {
      student?: string;
      assistant?: string;
    };
    /** Hora exacta conocida (HH:MM), cuando existe — usada para exportar un
     *  evento de calendario con hora en vez de todo el día. Solo se rellena
     *  para los tipos que de verdad la tienen (salidas, exhibidores, visita
     *  de pastoreo del CO); el resto se exporta como evento de todo el día
     *  en vez de inventar una hora. */
    startTime?: string;
    /** Hora exacta de fin, cuando se conoce (hoy solo Exhibidores). */
    endTime?: string;
  };
};

export type S89DataType = {
  id: string;
  weekOf: string;
  student_name: string;
  assistant_name: string;
  assignment_date: string;
  part_number: string;
  main_hall: boolean;
  aux_class_1: boolean;
  aux_class_2?: boolean;
};

export type MidweekMeetingDataType = {
  weekOf: string;
  updatedAt?: string;
  lastModifiedBy?: string;
  week_type: Week;
  week_type_name: string;
  schedule_title: string;
  no_meeting: boolean;
  aux_room_fsg?: string;
  chairman_A_name: string;
  chairman_B_name?: string;
  timing: {
    pgm_start: string;
    opening_comments: string;
    tgw_talk: string;
    tgw_gems: string;
    tgw_bible_reading: string;
    ayf_part1: string;
    ayf_part2: string;
    ayf_part3: string;
    ayf_part4: string;
    lc_middle_song: string;
    lc_part1: string;
    lc_part2: string;
    lc_part3: string;
    concluding_comments: string;
    co_talk?: string;
    cbs?: string;
    pgm_end: string;
  };
  song_first: string;
  /**
   * El título de la canción, aparte del número. Solo lo usa el programa de la
   * app: el formulario oficial S-140 lleva el número a secas y no se toca.
   */
  song_first_title?: string;
  opening_prayer_name: string;
  tgw_talk_src: string;
  tgw_talk_time: string;
  tgw_talk_name: string;
  tgw_gems_src: string;
  tgw_gems_time: string;
  tgw_gems_name: string;
  tgw_bible_reading_src: string;
  tgw_bible_reading_A_name: string;
  tgw_bible_reading_B_name?: string;
  ayf_part1_type: AssignmentCode;
  ayf_part1_type_name: string;
  ayf_part1_time: string;
  ayf_part1_label: string;
  ayf_part1_A_name: string;
  ayf_part1_A_student_name?: string;
  ayf_part1_A_assistant_name?: string;
  ayf_part1_B_name?: string;
  ayf_part1_B_student_name?: string;
  ayf_part1_B_assistant_name?: string;
  ayf_part2_type?: AssignmentCode;
  ayf_part2_type_name?: string;
  ayf_part2_time?: string;
  ayf_part2_label?: string;
  ayf_part2_A_name?: string;
  ayf_part2_A_student_name?: string;
  ayf_part2_A_assistant_name?: string;
  ayf_part2_B_name?: string;
  ayf_part2_B_student_name?: string;
  ayf_part2_B_assistant_name?: string;
  ayf_part3_type?: AssignmentCode;
  ayf_part3_type_name?: string;
  ayf_part3_time?: string;
  ayf_part3_label?: string;
  ayf_part3_A_name?: string;
  ayf_part3_A_student_name?: string;
  ayf_part3_A_assistant_name?: string;
  ayf_part3_B_name?: string;
  ayf_part3_B_student_name?: string;
  ayf_part3_B_assistant_name?: string;
  ayf_part_type?: AssignmentCode;
  ayf_part4_type_name?: string;
  ayf_part4_time?: string;
  ayf_part4_label?: string;
  ayf_part4_A_name?: string;
  ayf_part4_A_student_name?: string;
  ayf_part4_A_assistant_name?: string;
  ayf_part4_B_name?: string;
  ayf_part4_B_student_name?: string;
  ayf_part4_B_assistant_name?: string;
  lc_middle_song: string;
  lc_middle_song_title?: string;
  lc_count: number;
  lc_part1_time: string;
  lc_part1_src: string;
  lc_part1_name: string;
  lc_part2_time?: string;
  lc_part2_src?: string;
  lc_part2_name?: string;
  lc_part3_time?: string;
  lc_part3_src?: string;
  lc_part3_name?: string;
  lc_co_talk?: string;
  lc_cbs_title?: string;
  lc_cbs_time?: string;
  lc_cbs_label?: string;
  lc_cbs_name?: string;
  lc_cbs_conductor_name?: string;
  lc_cbs_reader_name?: string;
  lc_concluding_song: string;
  lc_concluding_song_title?: string;
  lc_concluding_prayer: string;
  co_name?: string;
  full: boolean;
  treasures: boolean;
  students: boolean;
  living: boolean;
  cbs: boolean;
  aux_class: boolean;
};

export type WeekendMeetingTimingsType = {
  pgm_start: string;
  public_talk: string;
  middle_song: string;
  w_study: string;
  service_talk?: string;
  pgm_end: string;
};

export type WeekendMeetingDataType = {
  show_songs: boolean;
  updatedAt?: string;
  lastModifiedBy?: string;
  date_raw: string;
  date_formatted: string;
  weekOf: string;
  no_meeting: boolean;
  week_type: Week;
  week_type_name: string;
  event_name: string;
  opening_song: number;
  opening_song_title: string;
  middle_song: number;
  closing_song: number;
  chairman_name: string;
  opening_prayer_name: string;
  public_talk_title?: string;
  public_talk_number: string;
  wtstudy_conductor_name: string;
  wtstudy_reader_name: string;
  speaker_1_name: string;
  speaker_2_name: string;
  speaker_cong_name: string;
  substitute_speaker_name: string;
  co_name?: string;
  concluding_prayer_name?: string;
  service_talk_title?: string;
  full: boolean;
  talk: boolean;
  wt_study: boolean;
  wt_study_only: boolean;
};

export type OutgoingSpeakersScheduleItem = {
  opening_song: { title: string; number: number };
  public_talk: { title: string; number: number };
  speaker: string;
  congregation_name: string;
  date: { date: Date; formatted: string };
  weekOf: string;
  weekOfFormatted: string;
};

export type OutgoingSpeakersScheduleType = OutgoingSpeakersScheduleItem[];
