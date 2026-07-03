import { SxProps, Theme } from '@mui/material';
import { CustomClassName } from '@definition/app';

export type TimeFieldProps = {
  className?: CustomClassName;
  value?: string;
  onChange?: (value: string) => void;
  sx?: SxProps<Theme>;
  hoursLength?: number;
  /** Cuando se pasa, el campo se muestra con borde y etiqueta como cualquier
   *  otro TextField (para usos fuera de tablas, donde no hay contexto visual
   *  alrededor que indique qué es este número). Sin ella, mantiene el estilo
   *  compacto sin borde ya usado dentro de tablas (p. ej. hours_editor). */
  label?: string;
};
