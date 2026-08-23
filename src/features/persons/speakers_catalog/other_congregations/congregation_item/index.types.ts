import { SpeakersCongregationsType } from '@definition/speakers_congregations';

export type IncomingCongregationType = {
  congregation: SpeakersCongregationsType;
  currentExpanded: string;
  onChangeCurrentExpanded: (value: string) => void;
  /**
   * Enseñar el circuito al lado del nombre.
   *
   * Solo en «Otras congregaciones», donde se mezclan circuitos y saber de cuál
   * es cada una es el dato que falta. En «Tu circuito» todas son del mismo, así
   * que ahí la etiqueta sería la misma en todas las filas: ruido.
   */
  showCircuit?: boolean;
};

export type useListType = {
  id: string;
  currentExpanded: string;
  onChangeCurrentExpanded: (value: string) => void;
};
