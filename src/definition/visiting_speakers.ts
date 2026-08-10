type SpeakerTalk = {
  _deleted: boolean;
  updatedAt: string;
  talk_number: number;
  talk_songs: number[];
};

export type VisitingSpeakerType = {
  person_uid: string;
  _deleted: { value: boolean; updatedAt: string };
  speaker_data: {
    cong_id: string;
    person_firstname: { value: string; updatedAt: string };
    person_lastname: { value: string; updatedAt: string };
    person_display_name: { value: string; updatedAt: string };
    person_notes: { value: string; updatedAt: string };
    person_email: { value: string; updatedAt: string };
    person_phone: { value: string; updatedAt: string };
    elder: { value: boolean; updatedAt: string };
    ministerial_servant: { value: boolean; updatedAt: string };
    talks: SpeakerTalk[];
    local: { value: boolean; updatedAt: string };
    /**
     * Lo añadió una persona a mano aquí, no la sincronización del circuito.
     *
     * Es un PUENTE, no un estado permanente: llega un hermano nuevo a una
     * congregación del circuito y aquí hace falta para cuadrar un discurso
     * antes de que a alguien le dé tiempo a meterlo en el Google Sheets.
     *
     * Sirve para dos cosas, y en los dos sitios significa lo mismo:
     *  · el sync diario del circuito NO le pone lápida por no venir en el
     *    Sheet de hoy (sin esto, desaparecía a la madrugada siguiente);
     *  · la pantalla deja editarlo, mientras que a los que vienen del Sheet
     *    solo los enseña.
     *
     * En cuanto el Sheet trae a ese hermano, lo reconoce por nombre y
     * congregación, fusiona sus discursos y APAGA esta marca: a partir de ahí
     * manda el Sheet, que es como tiene que ser el 99% de las veces.
     *
     * Opcional: los registros anteriores a esto no la llevan, y su ausencia
     * significa lo correcto — vino del Sheet o de antes.
     */
    manual?: { value: boolean; updatedAt: string };
  };
};

export type VisitingSpeakerBackupType = {
  person_uid: string;
  _deleted: string;
  speaker_data: string;
};
