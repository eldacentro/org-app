import { SxProps, Theme } from '@mui/material';

export type DragHandleProps = {
  /**
   * Qué se está moviendo, para el lector de pantalla: el nombre de la
   * categoría, del grupo, del hermano… Cinco asas idénticas seguidas no se
   * distinguen si todas dicen "Reordenar".
   */
  etiqueta: string;

  /** Mover una posición arriba (flecha ↑ con el asa enfocada). */
  onSubir?: () => void;

  /** Mover una posición abajo (flecha ↓ con el asa enfocada). */
  onBajar?: () => void;

  sx?: SxProps<Theme>;
};
