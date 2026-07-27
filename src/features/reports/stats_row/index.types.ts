import { CSSProperties } from 'react';
import { SxProps, Theme } from '@mui/material';

export type StatsRowProps = {
  title: string;
  /**
   * Texto además de número: hay filas que no son un recuento ("142 (marzo)") y
   * filas que no se pueden contar porque ya no se conservan los informes del
   * periodo, y ahí se dice en vez de enseñar un cero.
   */
  value: number | string;
  color?: CSSProperties['color'];
  colorValue?: boolean;
  sx?: SxProps<Theme>;
};
