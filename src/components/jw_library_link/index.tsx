import { SxProps } from '@mui/material';
import ActionPill from '@components/action_pill';

/**
 * El enlace a JW Library, igual en todas partes.
 *
 * Sale en "Mis asignaciones" y en las dos pestañas de reunión, y es el mismo
 * gesto, así que tiene que verse igual. Es la misma píldora que "Consejos",
 * "Documentos" o "Ver reunión completa": todo eso vive en `ActionPill`, y aquí
 * solo queda qué variante le toca a este enlace en cada sitio.
 */
const JwLibraryLink = ({
  href,
  label = 'JW Library',
  variant = 'subtle',
  sx,
}: {
  href: string;
  label?: string;
  /**
   * 'subtle' acompaña a una asignación concreta: en "Mis asignaciones" hay uno
   * por fila y rellenos serían un muro de color. 'solid' es la acción de la
   * pestaña en el programa semanal, donde hay una sola y tiene que verse.
   */
  variant?: 'subtle' | 'solid';
  sx?: SxProps;
}) => (
  <ActionPill
    href={href}
    label={label}
    variant={variant === 'solid' ? 'solid' : 'outline'}
    trailing=" ↗"
    sx={sx}
  />
);

export default JwLibraryLink;
