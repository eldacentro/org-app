import { VisitingSpeakerType } from '@definition/visiting_speakers';

export type SpeakerReadOnlyViewType = {
  speaker: VisitingSpeakerType;
  /**
   * Si aquí se pueden corregir los discursos.
   *
   * Lo decide la LISTA, no la fila: solo tiene sentido en los oradores de otras
   * congregaciones (los de casa se editan en su ficha), y preguntarlo fila a
   * fila costaba el hook de permisos entero por cada uno de los 650 oradores.
   */
  allowTalksFix?: boolean;
};
