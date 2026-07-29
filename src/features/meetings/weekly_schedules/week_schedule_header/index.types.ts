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
};
