import { CustomClassName } from '@definition/app';
import { SxProps, Theme } from '@mui/material';

export type LabelRowProps = {
  name: string;
  value: string | number;
  // Aclaración pequeña y gris bajo la etiqueta (p. ej. qué meses incluye el
  // cálculo) — para que el número no se malinterprete sin cambiar su valor.
  hint?: string;
  color?: string;
  className?: CustomClassName;
  sx?: SxProps<Theme>;
};
