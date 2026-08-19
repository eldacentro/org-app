import { ReactNode } from 'react';

export type WeekScheduleHeaderProps = {
  week: string;
  currentVisible: boolean;
  onCurrent: VoidFunction;
  lastUpdated?: string;
  /**
   * El título real del programa de esa semana, con su día. En las reuniones es
   * la fecha ("Miércoles 29 de julio") y debajo la lectura de la Biblia; en el
   * resto de pestañas no hay, y la cabecera se queda solo con el rango.
   */
  title?: string;
  subtitle?: string;
  /**
   * La acción propia de la pestaña: JW Library en las reuniones, Consejos en
   * salidas, Documentos en exhibidores. Va a la derecha del título para que
   * tenga peso sin ocupar una fila para ella sola.
   */
  action?: ReactNode;
  /**
   * Una acción de segunda fila, en la línea de «Última actualización».
   *
   * Va abajo y no junto a `action` porque ahí competiría: `action` es la acción
   * de la pestaña y tiene peso visual propio (el botón de JW Library es un
   * círculo rojo). Dos cosas llamativas seguidas se estorban.
   *
   * Esa última línea, en cambio, estaba vacía por la derecha, así que aquí se
   * equilibra la cabecera en vez de recargarla.
   */
  secondaryAction?: ReactNode;
};
