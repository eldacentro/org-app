export type PartTimingProps = {
  time: string;

  /**
   * Qué parte del programa es (`tgw_talk`, `ayf_part1`…).
   *
   * Solo lo pasan las partes de la reunión de entre semana, que es la única que
   * se puede seguir en directo. Sin él, el relojito se comporta como siempre.
   */
  partKey?: string;
};
