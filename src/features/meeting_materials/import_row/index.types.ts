import { ReactElement, ReactNode } from 'react';

export type ImportRowProps = {
  icon?: ReactElement;
  titulo: string;
  descripcion: string;
  /** Mientras se lee el archivo: rueda en lugar del icono, y sin clic. */
  isBusy?: boolean;
  onClick?: VoidFunction;
  /** Un `<input type="file">` transparente encima, si lo dispara así. */
  children?: ReactNode;
};
