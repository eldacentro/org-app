import { ReactNode } from 'react';
import { SxProps, Theme } from '@mui/material';

export type CardButtonProps = {
  children: ReactNode;

  onClick?: () => void;

  /**
   * Solo hace falta cuando el contenido de la tarjeta no basta para saber a
   * dónde lleva. Si dentro ya va el nombre del hermano, sobra.
   */
  ariaLabel?: string;

  sx?: SxProps<Theme>;
};
