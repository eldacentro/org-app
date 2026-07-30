import { ReactNode } from 'react';
import { SxProps, Theme } from '@mui/material';

export type EmptyStateProps = {
  /**
   * Un icono de `@components/icons`. El componente le pone el círculo y el
   * tamaño, así que se pasa a pelo: `<IconInfo />`.
   */
  icon?: ReactNode;

  /** La frase corta: "No hay documentos en esta categoría". */
  title: string;

  /** Opcional: qué hacer para que deje de estar vacío. */
  description?: string;

  /** Opcional: el botón que lo arregla ("Subir documento"). */
  action?: ReactNode;

  /**
   * La superficie de tarjeta. Por defecto SÍ, porque este bloque ocupa el
   * sitio de la tarjeta que habría si hubiese contenido. Quítala solo cuando
   * el estado vacío ES la pantalla entera (Avisos, Mis asignaciones).
   */
  surface?: boolean;

  /**
   * Para cuando va DENTRO de un diálogo o de una lista con scroll, donde un
   * bloque alto no cabe.
   */
  compact?: boolean;

  sx?: SxProps<Theme>;
};
